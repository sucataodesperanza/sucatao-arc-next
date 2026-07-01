import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMercadoPagoPayment, verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago"
import { alertPedidoPago } from "@/lib/discord-webhook"
import { sendDiscordDM, dmPedidoPago, createPrivateChannel, embedCanalEntrega } from "@/lib/discord-bot"

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  try {
    const signatureHeader = request.headers.get("x-signature")
    const requestIdHeader = request.headers.get("x-request-id")
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    const paymentId = body?.data?.id || body?.id || request.nextUrl.searchParams.get("data.id") || request.nextUrl.searchParams.get("id")
    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
    if (webhookSecret) {
      const isValid = await verifyMercadoPagoWebhookSignature(webhookSecret, signatureHeader, requestIdHeader, String(paymentId))
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const payment = await fetchMercadoPagoPayment(String(paymentId))
    if (!payment) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const eventId = `payment:${paymentId}:${payment.status ?? "unknown"}`
    const { error: insertError } = await supabase.from("payment_webhook_events").insert({
      provider: "mercado_pago",
      event_id: eventId,
      payment_reference: String(paymentId),
      payload: payment,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true })
      }
      throw insertError
    }

    const orderId = payment.external_reference
    if (!orderId) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const status = String(payment.status ?? "").toLowerCase()

    if (status === "approved") {
      const { data: updatedOrders } = await supabase
        .from("orders")
        .update({
          status: "completed",
          payment_status: "paid",
          payment_reference: String(paymentId),
          payment_provider_status: status,
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .neq("payment_status", "paid")
        .select("id, user_id, pass_group_id, items, total")

      // Ativa passe se for uma compra de passe via PIX
      if (updatedOrders?.length) {
        const ord = updatedOrders[0] as {
          id: string
          user_id: string
          pass_group_id?: string | null
          items?: Array<{ name: string; quantity: number }>
          total?: number
        }

        if (ord.pass_group_id) {
          await supabase.from("user_contract_group_purchases").upsert({
            user_id: ord.user_id, group_id: ord.pass_group_id,
            payment_method: "pix", order_id: ord.id,
          }, { onConflict: "user_id,group_id" })
        }

        // Alerta Discord — PIX confirmado
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, game_id, discord_id, discord_username")
          .eq("id", ord.user_id)
          .single()

        const pixItems = (ord.items ?? []).map((i) => ({ name: i.name, quantity: i.quantity }))
        const buyerName = profile?.username ?? profile?.discord_username ?? "Comprador"

        alertPedidoPago({
          orderId: ord.id,
          userName: buyerName,
          gameId: profile?.game_id ?? "—",
          items: pixItems,
          total: ord.total ?? 0,
        }).catch(() => {})

        // DM Discord ao comprador — fire-and-forget
        sendDiscordDM(
          profile?.discord_id,
          dmPedidoPago(buyerName, pixItems, ord.total ?? 0),
        )

        // Canal privado de entrega — só se o comprador tiver Discord vinculado
        if (profile?.discord_id) {
          const channelId = await createPrivateChannel({
            name: `entrega-${ord.id.slice(0, 8)}`,
            topic: `Pedido #${ord.id}`,
            buyerDiscordId: profile.discord_id,
            embed: embedCanalEntrega({
              orderId: ord.id,
              buyerName,
              items: pixItems,
              total: ord.total ?? 0,
            }),
          })
          if (channelId) {
            await supabase.from("orders").update({ discord_channel_id: channelId }).eq("id", ord.id)
          }
        }
      }
    } else if (status === "pending" || status === "in_process") {
      await supabase
        .from("orders")
        .update({ payment_status: "processing", payment_reference: String(paymentId), payment_provider_status: status })
        .eq("id", orderId)
        .neq("payment_status", "paid")
    } else if (status === "rejected" || status === "cancelled") {
      const { data: cancelledOrders, error: cancelError } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "failed",
          payment_reference: String(paymentId),
          payment_provider_status: status,
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .neq("payment_status", "paid")
        .neq("status", "cancelled")
        .select("id, items")

      if (!cancelError && cancelledOrders?.length) {
        const orderItems = (cancelledOrders[0].items ?? []) as Array<{ itemId: string; quantity: number }>
        if (orderItems.length > 0) {
          await supabase.rpc("restore_stock", {
            p_items: orderItems.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
          })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("store/webhooks/mercadopago error:", error)
    return NextResponse.json({ error: (error as Error).message || "Webhook failed." }, { status: 400 })
  }
}

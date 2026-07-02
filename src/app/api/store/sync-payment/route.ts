import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchMercadoPagoPayment, searchMercadoPagoPaymentByExternalReference } from "@/lib/mercadopago"
import { addItemsToInventory } from "@/lib/inventory"
import { creditExpeditionVaultPacks } from "@/lib/expedition-vault"
import { alertCofresExpedicao } from "@/lib/discord-webhook"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = body?.orderId
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório." }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_status, payment_reference, items, pass_group_id")
    .eq("id", orderId)
    .single()

  if (orderError || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
  }

  if (order.payment_status === "paid" || order.payment_status === "failed") {
    return NextResponse.json({ status: order.status, paymentStatus: order.payment_status })
  }

  const payment = order.payment_reference && /^\d+$/.test(order.payment_reference)
    ? await fetchMercadoPagoPayment(order.payment_reference)
    : await searchMercadoPagoPaymentByExternalReference(orderId)

  if (!payment) {
    return NextResponse.json({ status: order.status, paymentStatus: order.payment_status })
  }

  const mpStatus = String(payment.status ?? "").toLowerCase()
  let updates: Record<string, unknown> | null = null

  if (mpStatus === "approved") {
    updates = {
      status: "completed",
      payment_status: "paid",
      payment_reference: String(payment.id),
      payment_provider_status: mpStatus,
      paid_at: new Date().toISOString(),
    }
  } else if (mpStatus === "pending" || mpStatus === "in_process") {
    updates = { payment_status: "processing", payment_reference: String(payment.id), payment_provider_status: mpStatus }
  } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
    updates = {
      status: "cancelled",
      payment_status: "failed",
      payment_reference: String(payment.id),
      payment_provider_status: mpStatus,
      cancelled_at: new Date().toISOString(),
    }
  }

  if (updates) {
    await supabase.from("orders").update(updates).eq("id", orderId)

    // Adiciona ao inventário APENAS quando o status muda para "paid" pela primeira vez
    if (updates.payment_status === "paid" && order.payment_status !== "paid") {
      const passGroupId = (order as { pass_group_id?: string | null }).pass_group_id
      if (passGroupId) {
        // Passe comprado via PIX → ativa para o usuário
        const { createAdminClient } = await import("@/lib/supabase/admin")
        const admin = createAdminClient()
        await admin.from("user_contract_group_purchases").upsert({
          user_id: order.user_id as string, group_id: passGroupId,
          payment_method: "pix", order_id: orderId,
        }, { onConflict: "user_id,group_id" })
      } else if (Array.isArray(order.items)) {
        type OrderItem = { itemId?: string; quantity?: number; source?: string; type?: string }
        const allItems = order.items as OrderItem[]

        const vaultPackItems = allItems.filter(i => i.itemId && i.type === "expedition_vault_pack")
        const inventoryItems = allItems
          .filter(i => i.itemId && i.source !== "pass" && i.type !== "expedition_vault_pack")
          .map(i => ({ itemId: i.itemId!, quantity: i.quantity ?? 1 }))

        if (inventoryItems.length > 0) {
          await addItemsToInventory(order.user_id as string, inventoryItems, "pix")
        }

        for (const vaultItem of vaultPackItems) {
          const qty = vaultItem.quantity ?? 1
          const result = await creditExpeditionVaultPacks(order.user_id as string, qty)
          if (result.ok) {
            alertCofresExpedicao({
              orderId: orderId,
              userName: "—",
              gameId: "—",
              packsCount: qty,
              totalSlots: result.totalSlots,
              expeditionName: result.expeditionName,
              paymentMethod: "pix",
            }).catch(() => {})
          }
        }
      }
    }
  }

  return NextResponse.json({
    status: (updates?.status as string) ?? order.status,
    paymentStatus: (updates?.payment_status as string) ?? order.payment_status,
  })
}

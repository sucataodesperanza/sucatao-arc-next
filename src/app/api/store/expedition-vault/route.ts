import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { creditExpeditionVaultPacks } from "@/lib/expedition-vault"
import { createMercadoPagoPixPayment } from "@/lib/mercadopago"
import { isValidCpf } from "@/lib/cpf"
import { logEconomy } from "@/lib/economy"
import { alertCofresExpedicao } from "@/lib/discord-webhook"
import { sendDiscordDM } from "@/lib/discord-bot"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const quantity: number = typeof body.quantity === "number" && body.quantity >= 1 ? body.quantity : 1
  const mode: "points" | "cash" = body.mode === "cash" ? "cash" : "points"

  // Busca expedição ativa + perfil em paralelo
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const [expeditionRes, profileRes] = await Promise.all([
    admin
      .from("expeditions")
      .select("id, name, slots_per_pack, price_points, price_cash, item_name, item_image_url")
      .eq("status", "active")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("points, cpf, game_id, discord_id").eq("id", user.id).single(),
  ])

  const expedition = expeditionRes.data
  if (!expedition) {
    return NextResponse.json({ error: "Nenhuma expedição ativa no momento." }, { status: 409 })
  }

  const profile = profileRes.data
  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 })

  if (!profile.game_id?.trim()) {
    return NextResponse.json({ error: "Complete seu cadastro com o ID do jogo para finalizar o pedido.", code: "cadastro_incompleto" }, { status: 409 })
  }

  const userName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Desconhecido"
  const itemName = expedition.item_name ?? "Pacote de Cofre de Expedição"

  // ── Compra com pontos ─────────────────────────────────────────────────────
  if (mode === "points") {
    if (!expedition.price_points) {
      return NextResponse.json({ error: "Este item não está disponível por pontos." }, { status: 409 })
    }

    const totalCost = expedition.price_points * quantity
    const currentPoints = profile.points ?? 0

    if (currentPoints < totalCost) {
      return NextResponse.json({ error: `Pontos insuficientes. Você precisa de ${totalCost.toLocaleString("pt-BR")} pontos.` }, { status: 409 })
    }

    const newPoints = currentPoints - totalCost
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", user.id)

    if (updateError) return NextResponse.json({ error: "Erro ao debitar pontos." }, { status: 500 })

    const { data: order } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total: 0,
        status: "completed",
        payment_method: "pontos",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        items: [{
          source: "expedition_vault",
          itemId: expedition.id,
          name: itemName,
          type: "expedition_vault_pack",
          quantity,
          mode: "points",
          pointsCost: totalCost,
        }],
      })
      .select("id")
      .single()

    // Credita slots
    const credit = await creditExpeditionVaultPacks(user.id, quantity, expedition.id)

    // Discord — fire-and-forget
    if (credit.ok) {
      alertCofresExpedicao({
        orderId: order?.id ?? "—",
        userName,
        gameId: profile.game_id ?? "—",
        packsCount: quantity,
        totalSlots: credit.totalSlots,
        expeditionName: credit.expeditionName,
        paymentMethod: "pontos",
      }).catch(() => {})
    }

    if (profile.discord_id) {
      sendDiscordDM(
        profile.discord_id as string,
        `✅ **${quantity}× ${itemName}** adquirido! ${quantity * expedition.slots_per_pack} slots adicionados ao seu cofre da **${expedition.name}**.`,
      ).catch(() => {})
    }

    await logEconomy({
      player_id: user.id,
      action: "buy",
      value: totalCost,
      currency: "points",
      item_id: expedition.id,
      item_qty: quantity,
      source: "expedition_vault",
      source_id: order?.id,
    })

    return NextResponse.json({ ok: true, pointsOrderId: order?.id, pointsLeft: newPoints })
  }

  // ── Compra com PIX ────────────────────────────────────────────────────────
  if (!expedition.price_cash) {
    return NextResponse.json({ error: "Este item não está disponível por PIX." }, { status: 409 })
  }

  if (!isValidCpf(profile.cpf ?? "")) {
    return NextResponse.json({ error: "Complete seu cadastro com um CPF válido para pagar com PIX.", code: "cadastro_incompleto" }, { status: 409 })
  }

  const total = expedition.price_cash * quantity

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total,
      status: "pending",
      payment_method: "loja_oficial",
      payment_status: "pending",
      items: [{
        source: "expedition_vault",
        itemId: expedition.id,
        name: itemName,
        type: "expedition_vault_pack",
        quantity,
        mode: "cash",
        price: expedition.price_cash,
        lineTotal: total,
      }],
    })
    .select("id")
    .single()

  if (orderError) return NextResponse.json({ error: "Erro ao criar pedido.", detail: orderError.message }, { status: 500 })

  const fullName = (userName).trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(" ") || firstName

  try {
    const { paymentId, status, pixCode, pixQrCodeBase64, expiresAt } = await createMercadoPagoPixPayment(
      order.id,
      `Sucatão de Speranza — ${itemName} ×${quantity}`,
      total,
      { email: user.email ?? "comprador@sucatao.com.br", firstName, lastName, cpf: profile.cpf as string },
      request.nextUrl.origin,
    )

    await supabase.from("orders").update({
      payment_provider: "mercado_pago",
      payment_reference: paymentId,
      payment_provider_status: status,
      pix_code: pixCode,
      pix_qr_code_base64: pixQrCodeBase64,
      pix_expires_at: expiresAt,
    }).eq("id", order.id)

    return NextResponse.json({ ok: true, cashOrderId: order.id, pixCode, pixQrCodeBase64, expiresAt }, { status: 201 })
  } catch (mpError) {
    return NextResponse.json({ error: "Erro ao iniciar pagamento PIX.", cashOrderId: order.id }, { status: 502 })
  }
}

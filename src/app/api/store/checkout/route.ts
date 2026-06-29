import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMercadoPagoPixPayment } from "@/lib/mercadopago"
import { isValidCpf } from "@/lib/cpf"
import { addItemsToInventory } from "@/lib/inventory"
import { logEconomy } from "@/lib/economy"

type CheckoutItem = {
  itemId: string
  name: string
  type?: string
  rarity?: string
  value: number
  weightKg?: number
  image?: string
  mode: "points" | "cash"
  quantity: number
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = await request.json()
  const items: CheckoutItem[] = Array.isArray(body.items) ? body.items : []
  const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : null

  if (items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 })
  }

  for (const item of items) {
    if (!item.itemId || !item.name || typeof item.value !== "number" || typeof item.quantity !== "number" || item.quantity < 1 || (item.mode !== "points" && item.mode !== "cash")) {
      return NextResponse.json({ error: "Item do carrinho inválido." }, { status: 400 })
    }
  }

  const pointsItems = items.filter(i => i.mode === "points")
  const cashItems = items.filter(i => i.mode === "cash")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points, cpf, game_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 })
  }

  if (!profile.game_id?.trim()) {
    return NextResponse.json({ error: "Complete seu cadastro com o ID do jogo para finalizar o pedido.", code: "cadastro_incompleto" }, { status: 409 })
  }

  if (cashItems.length > 0 && !isValidCpf(profile.cpf ?? "")) {
    return NextResponse.json({ error: "Complete seu cadastro com um CPF válido para pagar com PIX.", code: "cadastro_incompleto" }, { status: 409 })
  }

  // Valida cupom server-side (só aplica a itens em dinheiro)
  type CouponRow = { id: string; discount: number; discount_type: string; usage_count: number; total_discounted: number }
  let validatedCoupon: CouponRow | null = null
  if (couponCode && cashItems.length > 0) {
    const admin = createAdminClient()
    const { data: coupon } = await admin
      .from("coupons")
      .select("id, discount, discount_type, usage_count, usage_limit, expiration_date, status, total_discounted")
      .eq("code", couponCode)
      .eq("status", "active")
      .single()

    const isExpired = coupon?.expiration_date && new Date(coupon.expiration_date) < new Date()
    const isOverLimit = coupon?.usage_limit != null && (coupon.usage_count ?? 0) >= coupon.usage_limit

    if (coupon && !isExpired && !isOverLimit) {
      validatedCoupon = coupon as CouponRow
    }
  }

  function groupByItem(list: CheckoutItem[]) {
    const map = new Map<string, number>()
    for (const i of list) map.set(i.itemId, (map.get(i.itemId) ?? 0) + i.quantity)
    return [...map.entries()].map(([itemId, quantity]) => ({ itemId, quantity }))
  }

  const stockPayload = groupByItem(items)
  const { error: stockError } = await supabase.rpc("decrement_stock", { p_items: stockPayload })
  if (stockError) {
    // stockError.message contém o item_id quando é 'Estoque insuficiente para o item X'
    const detail = stockError.message?.includes("Estoque insuficiente")
      ? stockError.message
      : "Um ou mais itens estão sem estoque suficiente."
    console.error("store/checkout decrement_stock error:", stockError.message)
    return NextResponse.json({ error: detail }, { status: 409 })
  }

  async function restoreStock(list: CheckoutItem[]) {
    if (list.length === 0) return
    await supabase.rpc("restore_stock", { p_items: groupByItem(list) })
  }

  const result: { points?: number; pointsOrderId?: string; cashOrderId?: string } = {}

  if (pointsItems.length > 0) {
    // Usa price_points do estoque se disponível, fallback para value × 24
    const pointsCost = pointsItems.reduce((sum, i) => sum + ((i as any).pricePoints ? (i as any).pricePoints * i.quantity : Math.round(i.value * 24) * i.quantity), 0)

    const currentPoints = profile.points ?? 0
    if (currentPoints < pointsCost) {
      await restoreStock(items)
      return NextResponse.json({ error: "Pontos insuficientes para resgatar os itens do carrinho." }, { status: 409 })
    }

    const newPoints = currentPoints - pointsCost
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: newPoints })
      .eq("id", user.id)

    if (updateError) {
      await restoreStock(items)
      return NextResponse.json({ error: "Erro ao debitar pontos." }, { status: 500 })
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total: 0,
        status: "completed",
        payment_method: "pontos",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        items: pointsItems.map(i => ({
          source: "catalog",
          itemId: i.itemId,
          name: i.name,
          type: i.type ?? null,
          rarity: i.rarity ?? null,
          weightKg: i.weightKg ?? null,
          image: i.image ?? null,
          quantity: i.quantity,
          mode: "points",
          pointsCost: Math.round(i.value * 24) * i.quantity,
        })),
      })
      .select("id")
      .single()

    if (orderError) {
      console.error("store/checkout points insert error:", orderError)
      await supabase.from("profiles").update({ points: currentPoints }).eq("id", user.id)
      await restoreStock(items)
      return NextResponse.json({ error: "Erro ao criar pedido de resgate.", detail: orderError.message }, { status: 500 })
    }

    result.points = newPoints
    result.pointsOrderId = order.id

    // Adiciona itens ao inventário do usuário (compra com pontos é imediata)
    await addItemsToInventory(user.id, pointsItems, "points")

    // Registra no economy_logs
    for (const item of pointsItems) {
      await logEconomy({ player_id: user.id, action: "buy", value: Math.round(item.value * 24) * item.quantity, currency: "points", item_id: item.itemId, item_qty: item.quantity, source: "shop", source_id: order?.id })
    }
  }

  if (cashItems.length > 0) {
    const subtotal = cashItems.reduce((sum, i) => sum + ((i as any).priceCash ?? i.value) * i.quantity, 0)
    const discountAmount = validatedCoupon
      ? validatedCoupon.discount_type === "percentage"
        ? subtotal * validatedCoupon.discount / 100
        : Math.min(subtotal, validatedCoupon.discount)
      : 0
    const total = Math.max(0, subtotal - discountAmount)

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total,
        status: "pending",
        payment_method: "loja_oficial",
        payment_status: "pending",
        ...(validatedCoupon ? { coupon_code: couponCode, discount_amount: discountAmount } : {}),
        items: cashItems.map(i => ({
          source: "catalog",
          itemId: i.itemId,
          name: i.name,
          type: i.type ?? null,
          rarity: i.rarity ?? null,
          weightKg: i.weightKg ?? null,
          image: i.image ?? null,
          quantity: i.quantity,
          mode: "cash",
          price: (i as any).priceCash ?? i.value,
          lineTotal: ((i as any).priceCash ?? i.value) * i.quantity,
        })),
      })
      .select("id")
      .single()

    if (orderError) {
      console.error("store/checkout cash insert error:", orderError)
      await restoreStock(cashItems)
      return NextResponse.json({ error: "Erro ao criar pedido de compra.", detail: orderError.message }, { status: 500 })
    }

    result.cashOrderId = order.id

    // Atualiza uso do cupom
    if (validatedCoupon) {
      const admin = createAdminClient()
      await admin.from("coupons").update({
        usage_count: validatedCoupon.usage_count + 1,
        total_discounted: (validatedCoupon.total_discounted ?? 0) + discountAmount,
      }).eq("id", validatedCoupon.id)
    }

    const fullName = ((user.user_metadata?.name as string | undefined) ?? "").trim()
    const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : ["Comprador"]
    const lastName = rest.join(" ") || firstName

    try {
      const { paymentId, status, pixCode, pixQrCodeBase64, expiresAt } = await createMercadoPagoPixPayment(
        order.id,
        `Sucatão de Speranza - ${cashItems.length} item(ns)`,
        total,
        { email: user.email ?? "comprador@sucatao.com.br", firstName, lastName, cpf: profile.cpf as string },
        request.nextUrl.origin,
      )

      await supabase
        .from("orders")
        .update({
          payment_provider: "mercado_pago",
          payment_reference: paymentId,
          payment_provider_status: status,
          pix_code: pixCode,
          pix_qr_code_base64: pixQrCodeBase64,
          pix_expires_at: expiresAt,
        })
        .eq("id", order.id)
    } catch (mpError) {
      console.error("store/checkout mercadopago preference error:", mpError)
      await restoreStock(cashItems)
      return NextResponse.json({ error: "Erro ao iniciar pagamento PIX.", detail: (mpError as Error).message, cashOrderId: order.id }, { status: 502 })
    }
  }

  return NextResponse.json(result, { status: 201 })
}

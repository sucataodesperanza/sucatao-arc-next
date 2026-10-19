import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMercadoPagoPixPayment } from "@/lib/mercadopago"
import { isValidCpf } from "@/lib/cpf"
import { addItemsToInventory } from "@/lib/inventory"
import { creditExpeditionVaultPacks } from "@/lib/expedition-vault"
import { logEconomy } from "@/lib/economy"
import { alertPedidoPontos, alertPedidoPix, alertCofresExpedicao } from "@/lib/discord-webhook"
import { sendDiscordDM, dmPedidoConfirmado } from "@/lib/discord-bot"
import { readReadyKits, readReadyKitItems } from "@/lib/ready-kit-store"
import { prepareReadyKitPurchase, validateReadyKit } from "@/lib/ready-kits"
import { parsePaintedWeaponId, preparePaintedWeaponPurchase } from "@/lib/weapon-stencils"
import { readPaintedWeaponItems } from "@/lib/painted-weapon-store"

type CheckoutItem = {
  itemId: string
  name: string
  type?: string
  rarity?: string
  value: number
  pricePoints?: number
  priceCash?: number
  kitContents?: string
  stencilId?: string
  stencilName?: string
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
  let items: CheckoutItem[] = Array.isArray(body.items) ? body.items : []
  const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : null

  if (items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 })
  }

  for (const item of items) {
    if (typeof item.itemId !== "string" || !item.itemId || !item.name || typeof item.value !== "number" || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 2000 || (item.mode !== "points" && item.mode !== "cash")) {
      return NextResponse.json({ error: "Item do carrinho inválido." }, { status: 400 })
    }
  }

  const readyKitLines = new Set<CheckoutItem>()
  const paintedLines = new Set<CheckoutItem>()
  if(items.some(i=>i.itemId.startsWith("painted:") || i.type==="painted_weapon")) {
    try {
      const ids=[...new Set(items.filter(i=>i.itemId.startsWith("painted:") || i.type==="painted_weapon").flatMap(i=>Object.values(parsePaintedWeaponId(i.itemId))))]
      const catalog=await readPaintedWeaponItems(ids)
      items=items.flatMap(line=>{
        if(!line.itemId.startsWith("painted:") && line.type!=="painted_weapon")return [line]
        const {weaponId,stencilId}=parsePaintedWeaponId(line.itemId)
        return preparePaintedWeaponPurchase(catalog.find(i=>i.id===weaponId),catalog.find(i=>i.id===stencilId),line).map(row=>{
          const component:CheckoutItem={itemId:row.item.id,name:row.name,type:row.item.type,rarity:row.item.rarity,value:row.item.value??0,pricePoints:row.item.pricePoints,priceCash:row.item.priceCash,image:row.item.image,weightKg:row.item.weightKg,quantity:row.quantity,mode:line.mode,stencilId:row.stencilId,stencilName:row.stencilName}
          paintedLines.add(component)
          return component
        })
      })
    }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível validar a estampa."},{status:409})}
  }
  const pointsUnitPrice = (item: CheckoutItem) => readyKitLines.has(item) ? item.pricePoints! : (item.pricePoints || Math.round(item.value * 24))
  // Resolve packages from the admin's current definition, never from client prices.
  if (items.some(i => i.itemId.startsWith("kit:") || i.type === "ready_kit")) {
    try {
      const [kits, catalog] = await Promise.all([readReadyKits(), readReadyKitItems()])
      const ids = new Set(catalog.map(i => i.id))
      items = items.flatMap(line => {
        if (!line.itemId.startsWith("kit:") && line.type !== "ready_kit") return [line]
        const kit = kits.find(k => `kit:${k.id}` === line.itemId && k.active)
        if (!kit) throw new Error("Um kit foi desativado. Remova-o do carrinho e escolha novamente.")
        validateReadyKit(kit, ids)
        return prepareReadyKitPurchase(kit, line).map(entry => {
          const item = catalog.find(i => i.id === entry.itemId)!
          const unit = entry.unitPrice
          const component = { itemId: item.id, name: item.name, type: item.type, rarity: item.rarity, image: item.image, value: unit, quantity: entry.quantity, mode: line.mode, ...(line.mode === "points" ? { pricePoints: unit } : { priceCash: unit }) }
          readyKitLines.add(component)
          return component
        })
      })
    } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar os kits." }, { status: 409 }) }
  }

  const pointsItems = items.filter(i => i.mode === "points")
  const cashItems = items.filter(i => i.mode === "cash")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points, cpf, game_id, discord_id")
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

  const stockableItems = items.filter(i => i.type !== "expedition_vault_pack")
  if (stockableItems.length > 0) {
    const stockPayload = groupByItem(stockableItems)
    const { error: stockError } = await supabase.rpc("decrement_stock", { p_items: stockPayload })
    if (stockError) {
      const detail = stockError.message?.includes("Estoque insuficiente")
        ? stockError.message
        : "Um ou mais itens estão sem estoque suficiente."
      console.error("store/checkout decrement_stock error:", stockError.message)
      return NextResponse.json({ error: detail }, { status: 409 })
    }
  }

  async function restoreStock(list: CheckoutItem[]) {
    const stockList = list.filter(i => i.type !== "expedition_vault_pack")
    if (stockList.length === 0) return
    await supabase.rpc("restore_stock", { p_items: groupByItem(stockList) })
  }

  const result: { points?: number; pointsOrderId?: string; cashOrderId?: string } = {}

  if (pointsItems.length > 0) {
    // Usa price_points do estoque se disponível, fallback para value × 24
    const pointsCost = pointsItems.reduce((sum, i) => sum + pointsUnitPrice(i) * i.quantity, 0)

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
          ...(paintedLines.has(i) && i.stencilId ? {stencilId:i.stencilId,stencilName:i.stencilName} : {}),
          type: i.type ?? null,
          rarity: i.rarity ?? null,
          weightKg: i.weightKg ?? null,
          image: i.image ?? null,
          quantity: i.quantity,
          mode: "points",
          pointsCost: pointsUnitPrice(i) * i.quantity,
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

    // Separa itens normais dos pacotes de cofre de expedição
    const vaultPackItems  = pointsItems.filter(i => i.type === "expedition_vault_pack")
    const regularItems    = pointsItems.filter(i => i.type !== "expedition_vault_pack")

    // Adiciona itens normais ao inventário (imediato)
    if (regularItems.length > 0) {
      await addItemsToInventory(user.id, regularItems, "points")
    }

    // Credita slots de cofre de expedição (imediato)
    const pointsUserName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Desconhecido"
    for (const vaultItem of vaultPackItems) {
      const result = await creditExpeditionVaultPacks(user.id, vaultItem.quantity, vaultItem.itemId)
      if (result.ok) {
        alertCofresExpedicao({
          orderId: order.id,
          userName: pointsUserName,
          gameId: profile.game_id ?? "—",
          packsCount: vaultItem.quantity,
          totalSlots: result.totalSlots,
          expeditionName: result.expeditionName,
          paymentMethod: "pontos",
        }).catch(() => {})
      }
    }

    // Alerta Discord — fire-and-forget
    alertPedidoPontos({
      orderId: order.id,
      userName: pointsUserName,
      gameId: profile.game_id ?? "—",
      items: pointsItems.map(i => ({ name: i.name, quantity: i.quantity })),
      pointsCost: pointsItems.reduce((s, i) => s + pointsUnitPrice(i) * i.quantity, 0),
    }).catch(() => {})

    // DM Discord ao comprador — fire-and-forget
    sendDiscordDM(
      (profile as { discord_id?: string | null }).discord_id,
      dmPedidoConfirmado(pointsUserName, pointsItems.map(i => ({ name: i.name, quantity: i.quantity }))),
    )

    // Registra no economy_logs
    for (const item of pointsItems) {
      await logEconomy({ player_id: user.id, action: "buy", value: pointsUnitPrice(item) * item.quantity, currency: "points", item_id: item.itemId, item_qty: item.quantity, source: "shop", source_id: order?.id })
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
          ...(paintedLines.has(i) && i.stencilId ? {stencilId:i.stencilId,stencilName:i.stencilName} : {}),
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

    // Alerta Discord — fire-and-forget
    alertPedidoPix({
      orderId: order.id,
      userName: (user.user_metadata?.name as string | undefined) ?? user.email ?? "Desconhecido",
      gameId: profile.game_id ?? "—",
      items: cashItems.map(i => ({ name: i.name, quantity: i.quantity })),
      total,
      couponCode: couponCode ?? null,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
    }).catch(() => {})

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

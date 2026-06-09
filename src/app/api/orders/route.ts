import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = await request.json()
  const {
    sellerId,
    inventoryId,
    productId,
    productName,
    pricingOptionId,
    pricingOptionLabel,
    unitQuantity,
    price,
    total,
    buyerGameId,
  } = body

  if (!sellerId || !productId || !price || !total) {
    return NextResponse.json({ error: "Dados do pedido incompletos." }, { status: 400 })
  }

  const { data: inventory, error: invError } = await supabase
    .from("seller_inventory")
    .select("stock")
    .eq("id", inventoryId)
    .eq("seller_id", sellerId)
    .single()

  if (invError || !inventory) {
    return NextResponse.json({ error: "Item não encontrado." }, { status: 404 })
  }

  if (inventory.stock < 1) {
    return NextResponse.json({ error: "Item sem estoque disponível." }, { status: 409 })
  }

  const orderItem = {
    productId,
    name: productName,
    quantity: 1,
    price: Number(price),
    lineTotal: Number(total),
    pricingOptionId: pricingOptionId ?? "unit",
    pricingOptionLabel: pricingOptionLabel ?? "Unidade",
    unitsPerPackage: Number(unitQuantity ?? 1),
    reservedUnits: Number(unitQuantity ?? 1),
    sellerId,
    sellerInventoryId: inventoryId,
    buyerGameId: buyerGameId ?? null,
    buyerConfirmed: false,
    sellerConfirmed: false,
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      total: Number(total),
      status: "pending",
      payment_method: "saldo_real",
      payment_status: "pending",
      items: [orderItem],
    })
    .select("id")
    .single()

  if (orderError) {
    return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 })
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 })
}

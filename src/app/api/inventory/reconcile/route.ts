import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { addItemsToInventory } from "@/lib/inventory"

/**
 * Reconcilia o inventário do usuário com todas as suas compras pagas.
 * Útil para recuperar itens de compras feitas antes do sistema de inventário.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Busca todos os pedidos pagos do usuário
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, items, payment_status, payment_method")
    .eq("user_id", user.id)
    .eq("payment_status", "paid")

  if (error) return NextResponse.json({ error: "Erro ao buscar pedidos." }, { status: 500 })

  let totalAdded = 0

  for (const order of orders ?? []) {
    if (!Array.isArray(order.items)) continue

    const inventoryItems = (order.items as Array<{ itemId?: string; quantity?: number }>)
      .filter(i => i.itemId)
      .map(i => ({ itemId: i.itemId!, quantity: i.quantity ?? 1 }))

    if (inventoryItems.length > 0) {
      await addItemsToInventory(user.id, inventoryItems, "reconcile")
      totalAdded += inventoryItems.length
    }
  }

  return NextResponse.json({ ok: true, orders_processed: (orders ?? []).length, items_synced: totalAdded })
}

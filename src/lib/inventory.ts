import { createAdminClient } from "@/lib/supabase/admin"

type OrderItem = { itemId: string; quantity?: number; [key: string]: unknown }

export type InventorySource = "points" | "pix" | "trade" | "reconcile" | "admin"

/**
 * Adiciona itens ao inventário do usuário e registra no histórico.
 * Usa upsert em user_inventory e append em inventory_history.
 */
export async function addItemsToInventory(
  userId: string,
  items: OrderItem[],
  source: InventorySource = "admin",
) {
  if (!items.length) return

  const supabase = createAdminClient()

  for (const item of items) {
    const qty = item.quantity ?? 1

    // Upsert em user_inventory
    const { data: existing } = await supabase
      .from("user_inventory")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("item_id", item.itemId)
      .single()

    if (existing) {
      await supabase
        .from("user_inventory")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("user_inventory")
        .insert({ user_id: userId, item_id: item.itemId, quantity: qty })
    }

    // Append no histórico (sempre registra o evento)
    await supabase
      .from("inventory_history")
      .insert({ user_id: userId, item_id: item.itemId, quantity: qty, source })
  }
}

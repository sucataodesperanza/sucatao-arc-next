import { createAdminClient } from "@/lib/supabase/admin"

type OrderItem = { itemId: string; quantity?: number; [key: string]: unknown }

/**
 * Adiciona itens ao inventário do usuário após uma compra.
 * Usa upsert com incremento de quantity para não duplicar entradas.
 */
export async function addItemsToInventory(userId: string, items: OrderItem[]) {
  if (!items.length) return

  const supabase = createAdminClient()

  for (const item of items) {
    const qty = item.quantity ?? 1
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
  }
}

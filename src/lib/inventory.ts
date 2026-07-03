import { createAdminClient } from "@/lib/supabase/admin"

type OrderItem = { itemId: string; quantity?: number; [key: string]: unknown }

export type InventorySource = "points" | "pix" | "trade" | "reconcile" | "admin" | "delivered"

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
      const { error: updErr } = await supabase
        .from("user_inventory")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id)
      if (updErr) console.error("[inventory] update error:", updErr.message, { userId, itemId: item.itemId })
    } else {
      const { error: insErr } = await supabase
        .from("user_inventory")
        .insert({ user_id: userId, item_id: item.itemId, quantity: qty })
      if (insErr) console.error("[inventory] insert error:", insErr.message, { userId, itemId: item.itemId })
    }

    // Append no histórico (sempre registra o evento)
    const { error: histErr } = await supabase
      .from("inventory_history")
      .insert({ user_id: userId, item_id: item.itemId, quantity: qty, source })
    if (histErr) console.error("[inventory_history] insert error:", histErr.message, { userId, itemId: item.itemId, source })
  }
}

/**
 * Remove itens do inventário do usuário e registra saída no histórico.
 * Chamado quando o admin confirma a entrega de um pedido no jogo.
 */
export async function removeItemsFromInventory(
  userId: string,
  items: OrderItem[],
) {
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

    if (!existing) continue

    if (existing.quantity <= qty) {
      const { error } = await supabase.from("user_inventory").delete().eq("id", existing.id)
      if (error) console.error("[inventory] delete error:", error.message, { userId, itemId: item.itemId })
    } else {
      const { error } = await supabase.from("user_inventory").update({ quantity: existing.quantity - qty }).eq("id", existing.id)
      if (error) console.error("[inventory] decrement error:", error.message, { userId, itemId: item.itemId })
    }

    const { error: histErr } = await supabase
      .from("inventory_history")
      .insert({ user_id: userId, item_id: item.itemId, quantity: qty, source: "delivered" })
    if (histErr) console.error("[inventory_history] delivered insert error:", histErr.message, { userId, itemId: item.itemId })
  }
}

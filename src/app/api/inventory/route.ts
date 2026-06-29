import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type InventoryEntry = {
  id: string
  quantity: number
  acquired_at: string
  catalog_items: {
    id: string
    name: string
    item_type: string | null
    rarity: string | null
    icon_url: string | null
    value: number | null
    weight_kg: number | null
    stack_size: number | null
    price_points: number | null
    price_cash: number | null
  }
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [], capacity: 100, used: 0 })

  const [profileRes, { data, error }] = await Promise.all([
    supabase.from("profiles").select("inventory_capacity").eq("id", user.id).single(),
    supabase
      .from("user_inventory")
      .select("id, quantity, acquired_at, catalog_items(id, name, item_type, rarity, icon_url, value, weight_kg, stack_size)")
      .eq("user_id", user.id)
      .order("acquired_at", { ascending: false })
      .returns<InventoryEntry[]>(),
  ])

  if (error) {
    console.error("api/inventory error:", error)
    return NextResponse.json({ items: [], capacity: 100, used: 0 })
  }

  const items = data ?? []

  // Busca preços do estoque para os itens do inventário
  const catalogIds = [...new Set(items.map(e => e.catalog_items?.id).filter(Boolean))]
  let priceMap: Record<string, { price_points: number | null; price_cash: number | null }> = {}
  if (catalogIds.length > 0) {
    const { data: stockData } = await supabase
      .from("stock_items")
      .select("catalog_item_id, price_points, price_cash")
      .in("catalog_item_id", catalogIds)
    for (const s of stockData ?? []) {
      priceMap[s.catalog_item_id] = { price_points: s.price_points, price_cash: s.price_cash }
    }
  }

  const itemsWithPrices = items.map(e => ({
    ...e,
    catalog_items: e.catalog_items
      ? { ...e.catalog_items, ...( priceMap[e.catalog_items.id] ?? { price_points: null, price_cash: null }) }
      : e.catalog_items,
  }))

  const capacity = (profileRes.data as { inventory_capacity: number } | null)?.inventory_capacity ?? 100
  const used     = items.reduce((s, e) => s + e.quantity, 0)

  return NextResponse.json({ items: itemsWithPrices, capacity, used })
}

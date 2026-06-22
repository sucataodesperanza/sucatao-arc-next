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
  }
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [] })

  const { data, error } = await supabase
    .from("user_inventory")
    .select("id, quantity, acquired_at, catalog_items(id, name, item_type, rarity, icon_url, value, weight_kg, stack_size)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false })
    .returns<InventoryEntry[]>()

  if (error) {
    console.error("api/inventory error:", error)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: data ?? [] })
}

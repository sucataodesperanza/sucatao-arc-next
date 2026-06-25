import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type HistoryEntry = {
  id: string
  quantity: number
  source: string
  acquired_at: string
  catalog_items: {
    id: string
    name: string
    item_type: string | null
    rarity: string | null
    icon_url: string | null
    value: number | null
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ history: [] })

  const { data, error } = await supabase
    .from("inventory_history")
    .select("id, quantity, source, acquired_at, catalog_items(id, name, item_type, rarity, icon_url, value)")
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false })
    .limit(100)
    .returns<HistoryEntry[]>()

  if (error) return NextResponse.json({ history: [] })
  return NextResponse.json({ history: data ?? [] })
}

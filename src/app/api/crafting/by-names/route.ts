import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CraftingItem } from "@/app/api/crafting/route"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const names: string[] = Array.isArray(body.names) ? body.names : []
  if (names.length === 0) return NextResponse.json({ items: [] })

  const supabase = await createClient()
  const { data } = await supabase
    .from("catalog_items")
    .select("id, name, item_type, rarity, workbench, icon_url, recipe")
    .in("name", names)
    .eq("active", true)
    .returns<CraftingItem[]>()

  return NextResponse.json({ items: data ?? [] })
}

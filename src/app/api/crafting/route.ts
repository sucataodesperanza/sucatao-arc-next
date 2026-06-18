import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type RecipeIngredient = { qty: number; name: string }

export type CraftingItem = {
  id: string
  name: string
  item_type: string | null
  rarity: string | null
  workbench: string | null
  icon_url: string | null
  recipe: RecipeIngredient[] | null
}

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, name, item_type, rarity, workbench, icon_url, recipe")
    .eq("active", true)
    .not("workbench", "is", null)
    .order("name")
    .returns<CraftingItem[]>()

  if (error) {
    console.error("api/crafting error:", error)
    return NextResponse.json({ error: "Erro ao carregar crafting." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

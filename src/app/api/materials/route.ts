import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type MaterialRow = {
  id: string
  name: string
  item_type: string | null
  rarity: string | null
  icon_url: string | null
  description: string | null
  value: number | null
  weight_kg: number | null
  stack_size: number | null
}

const MATERIAL_TYPES = [
  "Raw Material", "Topside Material", "Refined Material",
  "Material", "Basic Material", "Advanced Material", "Nature",
]

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("catalog_items")
    .select("id, name, item_type, rarity, icon_url, description, value, weight_kg, stack_size")
    .in("item_type", MATERIAL_TYPES)
    .eq("active", true)
    .order("name")
    .returns<MaterialRow[]>()

  if (error) {
    console.error("api/materials error:", error)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: data ?? [] })
}

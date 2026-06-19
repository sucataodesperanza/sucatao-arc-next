import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export type AdminCatalogItem = {
  id: string
  name: string
  item_type: string | null
  rarity: string | null
  workbench: string | null
  icon_url: string | null
  recipe:           Array<{ qty: number; name: string }> | null
  obtained_from:    Array<{ qty: number; name: string }> | null
  recycled_into:    Array<{ qty: number; name: string }> | null
  recovered_into:   Array<{ qty: number; name: string }> | null
  used_in_crafting: string[] | null
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q        = searchParams.get("q")?.trim() ?? ""
  const category = searchParams.get("category") ?? "all"

  const supabase = createAdminClient()
  let query = supabase
    .from("catalog_items")
    .select("id, name, item_type, rarity, workbench, icon_url, recipe, obtained_from, recycled_into, recovered_into, used_in_crafting")
    .eq("active", true)
    .order("name")

  if (q) query = query.ilike("name", `%${q}%`)
  if (category === "materials") query = query.is("workbench", null)
  if (category === "craftable") query = query.not("workbench", "is", null)

  const { data, error } = await query.returns<AdminCatalogItem[]>()

  if (error) {
    console.error("api/admin/crafting/items error:", error)
    return NextResponse.json({ error: "Erro ao carregar itens." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

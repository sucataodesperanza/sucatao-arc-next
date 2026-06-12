import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim() ?? ""

  const supabase = createAdminClient()

  const { data: stockRows, error: stockError } = await supabase
    .from("stock_items")
    .select("catalog_item_id")

  if (stockError) {
    console.error("api/admin/stock/available stock error:", stockError)
    return NextResponse.json({ error: "Erro ao carregar estoque." }, { status: 500 })
  }

  const stockedIds = (stockRows ?? []).map(r => r.catalog_item_id)

  let query = supabase
    .from("catalog_items")
    .select("id, name, item_type, rarity, icon_url")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(20)

  if (q) query = query.ilike("name", `%${q}%`)
  if (stockedIds.length > 0) query = query.not("id", "in", `(${stockedIds.join(",")})`)

  const { data, error } = await query

  if (error) {
    console.error("api/admin/stock/available GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar itens do catálogo." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

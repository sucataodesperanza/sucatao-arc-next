import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createAdminClient()

  let query = supabase
    .from("catalog_items_unstocked")
    .select("id, name, item_type, rarity, icon_url", { count: "exact" })
    .eq("active", true)
    .order("name", { ascending: true })
    .range(from, to)

  if (q) query = query.ilike("name", `%${q}%`)

  const { data, error, count } = await query

  if (error) {
    console.error("api/admin/stock/available GET error:", error)
    return NextResponse.json({ error: "Erro ao buscar itens do catálogo." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize })
}

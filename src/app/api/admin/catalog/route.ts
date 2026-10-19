import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim() ?? ""
  const rarity = searchParams.get("rarity") ?? "all"
  const type = searchParams.get("type") ?? "all"
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createAdminClient()
  let query = supabase
    .from("catalog_items")
    .select("id, name, name_en, item_type, rarity, icon_url, active, synced_at", { count: "exact" })
    .order("name", { ascending: true })

  if (q) {
    const pattern = `%${q.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}%`
    query = query.or(`name.ilike."${pattern}",name_en.ilike."${pattern}"`)
  }
  if (rarity !== "all") query = query.eq("rarity", rarity)
  if (type === "Research") query = query.in("item_type", ["Research", "Research Item"])
  else if (type !== "all") query = query.eq("item_type", type)

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error("api/admin/catalog GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar catálogo." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize })
}

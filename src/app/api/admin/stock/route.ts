import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcItemPrice } from "@/lib/pricing"

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim() ?? ""
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(2000, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createAdminClient()
  let query = supabase
    .from("stock_items")
    .select("catalog_item_id, value, quantity, featured, catalog_items!inner(name, item_type, rarity, icon_url)", { count: "exact" })
    .order("catalog_item_id", { ascending: true })

  if (q) query = query.ilike("catalog_items.name", `%${q}%`)

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error("api/admin/stock GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar estoque." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const catalogItemId = body.catalog_item_id
  if (typeof catalogItemId !== "string" || !catalogItemId) {
    return NextResponse.json({ error: "catalog_item_id é obrigatório." }, { status: 400 })
  }

  const value    = typeof body.value    === "number"  ? body.value    : 0
  const quantity = typeof body.quantity === "number"  ? body.quantity : 0
  const featured = typeof body.featured === "boolean" ? body.featured : false

  // Auto-gera preços via VEI (admin pode sobrescrever)
  const pricing = await calcItemPrice(catalogItemId)
  const price_points = typeof body.price_points === "number" ? body.price_points : pricing.price_points
  const price_cash   = typeof body.price_cash   === "number" ? body.price_cash   : pricing.price_cash

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("stock_items")
    .insert({ catalog_item_id: catalogItemId, value, quantity, featured, price_points, price_cash })

  if (error) {
    console.error("api/admin/stock POST error:", error)
    return NextResponse.json({ error: "Erro ao adicionar item ao estoque." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

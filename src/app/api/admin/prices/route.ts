import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { validatePriceBatch } from "@/lib/price-editor"

export async function GET(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const params = new URL(request.url).searchParams
  const page = Math.max(1, Math.trunc(Number(params.get("page")) || 1))
  const pageSize = 500
  const { data, error, count } = await createAdminClient()
    .from("catalog_items")
    .select("id, name, rarity, item_type, icon_url, active, stock_items!inner(price_points, price_cash, quantity)", { count: "exact" })
    .eq("active", true)
    .order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (error) return NextResponse.json({ error: "Não foi possível carregar os preços dos itens ativos." }, { status: 500 })
  const items = (data ?? []).flatMap(item => {
    if (item.active !== true) return []
    const stocks = Array.isArray(item.stock_items) ? item.stock_items : [item.stock_items]
    return stocks.filter(Boolean).map(stock => ({
      catalog_item_id: item.id,
      ...stock,
      catalog_items: { name: item.name, rarity: item.rarity, item_type: item.item_type, icon_url: item.icon_url, active: item.active },
    }))
  })
  return NextResponse.json({ items, total: count ?? 0, page, pageSize }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const rows = validatePriceBatch(await request.json().catch(() => null))
  if (!rows) return NextResponse.json({ error: "Lote inválido. Confira os preços e envie até 100 itens por vez." }, { status: 400 })
  const admin = createAdminClient()
  const results: { id: string; ok: boolean; error?: string }[] = []
  for (let index = 0; index < rows.length; index += 10) {
    results.push(...await Promise.all(rows.slice(index, index + 10).map(async row => {
      try {
        let query = admin.from("stock_items").update({ ...row.changes, updated_at: new Date().toISOString() }).eq("catalog_item_id", row.id)
        for (const [field, value] of Object.entries(row.expected)) query = value === null ? query.is(field, null) : query.eq(field, value)
        const { data, error } = await query.select("catalog_item_id")
        if (error) return { id: row.id, ok: false, error: "Não foi possível salvar. Tente novamente." }
        return data?.length ? { id: row.id, ok: true } : { id: row.id, ok: false, error: "O preço mudou ou o item foi removido. Desfaça esta linha e atualize a lista antes de editar novamente." }
      } catch { return { id: row.id, ok: false, error: "Falha ao salvar este item. Tente novamente." } }
    })))
  }
  return NextResponse.json({ results })
}

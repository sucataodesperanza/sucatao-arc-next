import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcVei } from "@/lib/vei"
import { getEconomySettings } from "@/lib/pricing"

// Adiciona TODOS os catalog_items ativos ao estoque de uma vez.
// Calcula price_points e price_cash via VEI para cada item.
export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()
  const settings = await getEconomySettings()

  // Busca TODOS os catalog_items ativos com paginação (sem limite de 1000)
  const allItems: { id: string; value: number | null; rarity: string | null; item_type: string | null }[] = []
  const PAGE_SIZE = 1000
  let page = 0
  while (true) {
    const { data, error } = await admin
      .from("catalog_items")
      .select("id, value, rarity, item_type")
      .eq("active", true)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error || !data?.length) break
    allItems.push(...data)
    if (data.length < PAGE_SIZE) break
    page++
  }

  if (!allItems.length) return NextResponse.json({ ok: true, added: 0 })

  // Busca VEIs já calculados (com paginação também)
  const allEconomics: { item_id: string; vei: number }[] = []
  page = 0
  while (true) {
    const { data, error } = await admin.from("item_economics").select("item_id, vei").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error || !data?.length) break
    allEconomics.push(...data)
    if (data.length < PAGE_SIZE) break
    page++
  }
  const veiMap = Object.fromEntries(allEconomics.map(e => [e.item_id, Number(e.vei)]))

  // Busca itens já no estoque (com paginação)
  const inStockIds: string[] = []
  page = 0
  while (true) {
    const { data, error } = await admin.from("stock_items").select("catalog_item_id").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error || !data?.length) break
    inStockIds.push(...data.map(s => s.catalog_item_id))
    if (data.length < PAGE_SIZE) break
    page++
  }
  const inStockSet = new Set(inStockIds)

  // Monta rows (apenas novos) — quantity 99999 para "ilimitado" (compatível com decrement_stock)
  const rows = allItems
    .filter(item => !inStockSet.has(item.id))
    .map(item => {
      const vei = veiMap[item.id] ?? calcVei(item.value, item.rarity, item.item_type)
      return {
        catalog_item_id: item.id,
        value:           item.value ?? 0,
        quantity:        99999, // estoque "ilimitado"
        featured:        false,
        price_points:    Math.max(1, Math.round(vei * settings.points_multiplier)),
        price_cash:      Math.max(0.01, parseFloat((vei * settings.cash_multiplier).toFixed(2))),
      }
    })

  if (!rows.length) return NextResponse.json({ ok: true, added: 0, skipped: inStockSet.size })

  // Upsert em batches de 200 (upsert evita falha por duplicata)
  const BATCH = 200
  let added = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from("stock_items").upsert(rows.slice(i, i + BATCH), { onConflict: "catalog_item_id", ignoreDuplicates: true })
    if (!error) added += Math.min(BATCH, rows.length - i)
  }

  return NextResponse.json({ ok: true, added, skipped: inStockSet.size, total_catalog: allItems.length })
}

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

  // Busca todos os catalog_items ativos
  const { data: allItems } = await admin
    .from("catalog_items")
    .select("id, value, rarity, item_type")
    .eq("active", true)

  if (!allItems?.length) return NextResponse.json({ ok: true, added: 0 })

  // Busca VEIs já calculados
  const { data: economics } = await admin
    .from("item_economics")
    .select("item_id, vei")
  const veiMap = Object.fromEntries((economics ?? []).map(e => [e.item_id, Number(e.vei)]))

  // Busca itens já no estoque
  const { data: inStock } = await admin.from("stock_items").select("catalog_item_id")
  const inStockSet = new Set((inStock ?? []).map(s => s.catalog_item_id))

  // Monta os rows para inserção (apenas itens que ainda não estão no estoque)
  const rows = allItems
    .filter(item => !inStockSet.has(item.id))
    .map(item => {
      const vei = veiMap[item.id] ?? calcVei(item.value, item.rarity, item.item_type)
      return {
        catalog_item_id: item.id,
        value:           item.value ?? 0,
        quantity:        -1, // -1 = ilimitado
        featured:        false,
        price_points:    Math.max(1, Math.round(vei * settings.points_multiplier)),
        price_cash:      Math.max(0.01, parseFloat((vei * settings.cash_multiplier).toFixed(2))),
      }
    })

  if (!rows.length) return NextResponse.json({ ok: true, added: 0, skipped: inStockSet.size })

  // Insere em batches de 200
  const BATCH = 200
  let added = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from("stock_items").insert(rows.slice(i, i + BATCH))
    if (!error) added += Math.min(BATCH, rows.length - i)
  }

  return NextResponse.json({ ok: true, added, skipped: inStockSet.size })
}

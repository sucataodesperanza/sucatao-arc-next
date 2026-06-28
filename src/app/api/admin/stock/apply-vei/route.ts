import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcVei } from "@/lib/vei"
import { getEconomySettings } from "@/lib/pricing"

// Aplica preços baseados em VEI para itens do estoque.
// Body: { item_ids?: string[] } — se vazio, aplica a todos.
export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const settings = await getEconomySettings()

  // Busca VEIs
  const { data: economics } = await admin.from("item_economics").select("item_id, vei")
  const veiMap = Object.fromEntries((economics ?? []).map(e => [e.item_id, Number(e.vei)]))

  // Busca itens do estoque (filtrado ou todos)
  let q = admin.from("stock_items").select("catalog_item_id, catalog_items(value, rarity, item_type)")
  if (body.item_ids?.length) q = (q as any).in("catalog_item_id", body.item_ids)

  const { data: stockItems } = await q
  if (!stockItems?.length) return NextResponse.json({ ok: true, updated: 0 })

  let updated = 0
  for (const si of stockItems) {
    const cat = (si as any).catalog_items
    const vei = veiMap[si.catalog_item_id] ?? calcVei(cat?.value, cat?.rarity, cat?.item_type)
    const price_points = Math.max(1, Math.round(vei * settings.points_multiplier))
    const price_cash   = Math.max(0.01, parseFloat((vei * settings.cash_multiplier).toFixed(2)))
    await admin.from("stock_items").update({ price_points, price_cash }).eq("catalog_item_id", si.catalog_item_id)
    updated++
  }

  return NextResponse.json({ ok: true, updated })
}

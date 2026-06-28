import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcVei, calcLiquidity } from "@/lib/vei"

// Recalcula VEI e item_economics para todos os itens do catálogo.
// Chamado manualmente pelo admin ou pelo cron diário.
export async function POST(request: NextRequest) {
  // Permite chamada via cron (CRON_SECRET) ou via admin logado
  const cronSecret = request.headers.get("x-cron-secret")
  if (cronSecret !== process.env.CRON_SECRET) {
    const guard = await requireAdmin()
    if (guard.error) return guard.error
  }

  const admin = createAdminClient()

  // Busca todos os itens do catálogo
  const { data: items, error: itemsError } = await admin
    .from("catalog_items")
    .select("id, rarity, value, item_type")

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  if (!items?.length) return NextResponse.json({ ok: true, updated: 0 })

  // Busca contagens de trade por item (últimos 7 dias)
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: tradeData } = await admin
    .from("economy_logs")
    .select("item_id")
    .in("source", ["trade", "shop", "contract"])
    .gte("created_at", since7d)
    .not("item_id", "is", null)

  const weeklyDemandMap: Record<string, number> = {}
  for (const row of tradeData ?? []) {
    if (row.item_id) weeklyDemandMap[row.item_id] = (weeklyDemandMap[row.item_id] ?? 0) + 1
  }

  // Busca trade_count total
  const { data: totalTradeData } = await admin
    .from("economy_logs")
    .select("item_id")
    .in("source", ["trade", "shop"])
    .not("item_id", "is", null)

  const tradeCountMap: Record<string, number> = {}
  for (const row of totalTradeData ?? []) {
    if (row.item_id) tradeCountMap[row.item_id] = (tradeCountMap[row.item_id] ?? 0) + 1
  }

  // Calcula VEI para cada item e faz upsert
  const BATCH = 200
  let updated = 0

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const rows = batch.map(item => {
      const tradeCount   = tradeCountMap[item.id]   ?? 0
      const weeklyDemand = weeklyDemandMap[item.id] ?? 0
      const vei = calcVei(item.value, item.rarity, item.item_type)
      const liquidityScore = calcLiquidity(tradeCount, weeklyDemand)
      return {
        item_id:           item.id,
        vei,
        trade_count:       tradeCount,
        weekly_demand:     weeklyDemand,
        liquidity_score:   liquidityScore,
        last_calculated_at: new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      }
    })

    const { error } = await admin.from("item_economics").upsert(rows, { onConflict: "item_id" })
    if (error) console.error("recalc-vei batch error:", error.message)
    else updated += rows.length
  }

  return NextResponse.json({ ok: true, updated })
}

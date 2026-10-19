import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcVei } from "@/lib/vei"

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some((id: unknown) => typeof id !== "string" || !id || id.length > 200)) return NextResponse.json({ error: "Selecione de 1 a 100 itens por lote." }, { status: 400 })
  const admin = createAdminClient()
  const [catalog, economics, settings] = await Promise.all([
    admin.from("catalog_items").select("id,value,rarity,item_type").in("id", body.ids),
    admin.from("item_economics").select("item_id,vei").in("item_id", body.ids),
    admin.from("economy_settings").select("points_multiplier,cash_multiplier").eq("id", 1).single(),
  ])
  if (catalog.error || economics.error || settings.error) return NextResponse.json({ error: "Não foi possível calcular as sugestões." }, { status: 500 })
  const points = Number(settings.data.points_multiplier), cash = Number(settings.data.cash_multiplier)
  if (!Number.isFinite(points) || !Number.isFinite(cash) || points <= 0 || cash <= 0) return NextResponse.json({ error: "Confira os multiplicadores na aba Economia." }, { status: 400 })
  const map = new Map(economics.data.map(row => [row.item_id, Number(row.vei)]))
  const items = catalog.data.map(item => {
    const saved = map.get(item.id)
    const vei = saved && Number.isFinite(saved) ? saved : calcVei(item.value, item.rarity, item.item_type)
    return { id: item.id, price_points: Math.max(1, Math.round(vei * points)), price_cash: Math.max(0.01, Math.round(vei * cash * 100) / 100) }
  })
  return NextResponse.json({ items })
}

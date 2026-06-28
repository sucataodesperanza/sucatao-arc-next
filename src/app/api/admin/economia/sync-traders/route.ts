import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const res = await fetch("https://metaforge.app/api/arc-raiders/traders", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return NextResponse.json({ error: `MetaForge retornou ${res.status}` }, { status: 502 })

    const body = await res.json()

    // Formato MetaForge: { data: { TraderName: [...items], ... }, ... }
    const rawData = body.data ?? body
    let rows: { id: string; name: string; items: unknown[]; synced_at: string }[] = []

    if (typeof rawData === "object" && rawData !== null && !Array.isArray(rawData)) {
      // { TraderName: [{id, name, value, rarity, trader_price, ...}] }
      rows = Object.entries(rawData).map(([traderName, items]) => ({
        id:        traderName.toLowerCase().replace(/\s+/g, "-"),
        name:      traderName,
        items:     Array.isArray(items) ? items : [],
        synced_at: new Date().toISOString(),
      }))
    } else if (Array.isArray(rawData)) {
      rows = (rawData as any[]).map((t: any) => ({
        id:        String(t.id ?? t.traderId ?? t.name),
        name:      t.name ?? "—",
        items:     t.items ?? [],
        synced_at: new Date().toISOString(),
      }))
    } else {
      return NextResponse.json({ error: "Formato inesperado da API MetaForge" }, { status: 502 })
    }

    if (!rows.length) return NextResponse.json({ error: "Nenhum trader encontrado na resposta" }, { status: 502 })

    const admin = createAdminClient()

    const { error } = await admin.from("game_traders").upsert(rows, { onConflict: "id" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, synced: rows.length })
  } catch (err) {
    return NextResponse.json({ error: `MetaForge indisponível: ${(err as Error).message}` }, { status: 502 })
  }
}

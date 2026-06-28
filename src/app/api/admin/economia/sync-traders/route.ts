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
    const traders = body.data ?? body ?? []
    if (!Array.isArray(traders)) return NextResponse.json({ error: "Formato inesperado da API" }, { status: 502 })

    const admin = createAdminClient()
    const rows = traders.map((t: any) => ({
      id:        String(t.id ?? t.traderId ?? t.name),
      name:      t.name ?? "—",
      items:     t.items ?? [],
      synced_at: new Date().toISOString(),
    }))

    const { error } = await admin.from("game_traders").upsert(rows, { onConflict: "id" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, synced: rows.length })
  } catch (err) {
    return NextResponse.json({ error: `MetaForge indisponível: ${(err as Error).message}` }, { status: 502 })
  }
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const res = await fetch("https://metaforge.app/api/arc-raiders/quests", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return NextResponse.json({ error: `MetaForge retornou ${res.status}` }, { status: 502 })

    const body = await res.json()
    const quests = body.data ?? body ?? []
    if (!Array.isArray(quests)) return NextResponse.json({ error: "Formato inesperado da API" }, { status: 502 })

    const admin = createAdminClient()
    const rows = quests.map((q: any) => ({
      id:             String(q.id ?? q.questId ?? q.name),
      name:           q.name ?? "—",
      description:    q.description ?? "",
      required_items: q.requiredItems ?? q.required_items ?? [],
      reward:         q.reward ?? {},
      difficulty:     q.difficulty ?? "",
      synced_at:      new Date().toISOString(),
    }))

    const { error } = await admin.from("game_quests").upsert(rows, { onConflict: "id" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, synced: rows.length })
  } catch (err) {
    return NextResponse.json({ error: `MetaForge indisponível: ${(err as Error).message}` }, { status: 502 })
  }
}

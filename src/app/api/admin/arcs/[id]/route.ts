import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

type PatchBody = {
  type?: string | null
  threat?: string | null
  weakness?: string | null
  destroy_xp?: number | null
  loot_xp?: number | null
  drops?: string[] | null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = (await req.json()) as PatchBody

  const patch: Record<string, unknown> = {}
  if ("type" in body) patch.type = body.type ?? null
  if ("threat" in body) patch.threat = body.threat ?? null
  if ("weakness" in body) patch.weakness = body.weakness ?? null
  if ("destroy_xp" in body) patch.destroy_xp = body.destroy_xp ?? null
  if ("loot_xp" in body) patch.loot_xp = body.loot_xp ?? null
  if ("drops" in body) patch.drops = body.drops ?? null

  const supabase = createAdminClient()
  const { error } = await supabase.from("arcs").update(patch).eq("id", id)

  if (error) {
    console.error("api/admin/arcs/[id] patch error:", error)
    return NextResponse.json({ error: "Erro ao atualizar ARC." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const allowed = ["type","tier","title","description","story","image_url","objective","total",
    "sucatas","xp","rep","location","estimated_time","best_time_of_day","climate",
    "environmental_risk","expires_at","variant","bonus_condition","bonus_reward",
    "rewards","objectives","enemies","success_rate","players_completed",
    "best_record_time","best_record_player","active"]

  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  const { error } = await admin.from("contracts").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("contracts").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

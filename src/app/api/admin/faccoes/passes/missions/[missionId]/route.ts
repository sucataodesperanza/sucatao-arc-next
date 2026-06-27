import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ missionId: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { missionId } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const allowed = ["points_reward", "title", "description", "total", "item_reward"]
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k]

  const { error } = await admin
    .from("contract_group_missions")
    .update(update)
    .eq("id", missionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ missionId: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { missionId } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("contract_group_missions").delete().eq("id", missionId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

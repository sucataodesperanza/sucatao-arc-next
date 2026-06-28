import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const allowed = ["name","platform","channel_url","avatar_url","viewers_text","verified","active","position","color"]
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k]
  const { error } = await admin.from("streamers").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("streamers").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

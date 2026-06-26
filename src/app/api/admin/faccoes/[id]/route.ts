import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createAdminClient()

  const update: Record<string, unknown> = {}
  if (body.name        !== undefined) update.name        = body.name
  if (body.tagline     !== undefined) update.tagline     = body.tagline
  if (body.description !== undefined) update.description = body.description
  if (body.color       !== undefined) update.color       = body.color
  if (body.icon_url    !== undefined) update.icon_url    = body.icon_url
  if (body.bonuses     !== undefined) update.bonuses     = body.bonuses
  if (body.active      !== undefined) update.active      = body.active
  if (body.position    !== undefined) update.position    = body.position

  const { error } = await supabase.from("factions").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("factions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

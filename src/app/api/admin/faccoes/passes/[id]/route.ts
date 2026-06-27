import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const allowed = ["title", "description", "type", "starts_at", "expires_at", "active"]
  const update: Record<string, unknown> = {}
  for (const k of allowed) if (body[k] !== undefined) update[k] = body[k]

  const { error } = await admin.from("contract_groups").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("contract_groups").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

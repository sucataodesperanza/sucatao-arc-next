import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = {}
  if (typeof body.label         === "string")  update.label         = body.label
  if (typeof body.scheduled_for === "string")  update.scheduled_for = body.scheduled_for
  if (typeof body.capacity      === "number")  update.capacity      = body.capacity
  if (typeof body.active        === "boolean") update.active        = body.active

  const supabase = createAdminClient()
  const { error } = await supabase.from("trade_slots").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: "Erro ao atualizar slot." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("trade_slots").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Erro ao remover slot." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

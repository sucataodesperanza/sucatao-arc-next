import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { drawSorteio } from "@/lib/sorteios-draw"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  if (body.action === "draw") {
    await drawSorteio(id, admin)
    return NextResponse.json({ ok: true })
  }

  if (body.action === "cancel") {
    const { error } = await admin.from("sorteios").update({ status: "cancelled" }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "activate") {
    const { error } = await admin.from("sorteios").update({ status: "active" }).eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Update fields
  const allowed = ["title", "description", "image_url", "badge", "badge_color", "ticket_price", "max_tickets", "starts_at", "ends_at"]
  const updates: Record<string, unknown> = {}
  for (const k of allowed) { if (k in body) updates[k] = body[k] }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 })

  const { error } = await admin.from("sorteios").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from("sorteios").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

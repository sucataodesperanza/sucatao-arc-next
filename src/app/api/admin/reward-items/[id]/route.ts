import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name        === "string")  update.name        = body.name
  if (typeof body.description === "string")  update.description = body.description
  if (typeof body.image_url   === "string")  update.image_url   = body.image_url
  if (typeof body.price       === "number")  update.price       = body.price
  if (typeof body.stock       === "number")  update.stock       = body.stock
  if (typeof body.featured    === "boolean") update.featured    = body.featured
  if (typeof body.active      === "boolean") update.active      = body.active
  if ("expires_at" in body)                  update.expires_at  = body.expires_at ?? null

  const supabase = createAdminClient()
  const { error } = await supabase.from("reward_items").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("reward_items").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Erro ao remover." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

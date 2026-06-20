import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.offer_points    === "number")  update.offer_points    = body.offer_points
  if (typeof body.want_item_name  === "string")  update.want_item_name  = body.want_item_name
  if (typeof body.want_item_qty   === "number")  update.want_item_qty   = body.want_item_qty
  if ("want_item_icon"    in body) update.want_item_icon   = body.want_item_icon   ?? null
  if ("want_item_rarity"  in body) update.want_item_rarity = body.want_item_rarity ?? null
  if (typeof body.status      === "string") update.status      = body.status
  if ("expires_at" in body)                 update.expires_at  = body.expires_at ?? null

  const supabase = createAdminClient()
  const { error } = await supabase.from("trades").update(update).eq("id", id)

  if (error) return NextResponse.json({ error: "Erro ao atualizar trade." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("trades").delete().eq("id", id)

  if (error) return NextResponse.json({ error: "Erro ao remover trade." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

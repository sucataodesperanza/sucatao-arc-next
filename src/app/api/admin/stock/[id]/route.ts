import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = {}
  if (typeof body.value        === "number")  update.value        = body.value
  if (typeof body.quantity     === "number")  update.quantity     = body.quantity
  if (typeof body.featured     === "boolean") update.featured     = body.featured
  if (typeof body.price_points === "number")  update.price_points = body.price_points
  if (typeof body.price_cash   === "number")  update.price_cash   = body.price_cash

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("stock_items").update(update).eq("catalog_item_id", id)

  if (error) {
    console.error("api/admin/stock/[id] PATCH error:", error)
    return NextResponse.json({ error: "Erro ao atualizar item do estoque." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("stock_items").delete().eq("catalog_item_id", id)

  if (error) {
    console.error("api/admin/stock/[id] DELETE error:", error)
    return NextResponse.json({ error: "Erro ao remover item do estoque." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

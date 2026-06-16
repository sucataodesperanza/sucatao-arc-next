import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = {}
  if (typeof body.active === "boolean") update.active = body.active
  if ("recipe" in body) update.recipe = body.recipe ?? null

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("catalog_items").update(update).eq("id", id)

  if (error) {
    console.error("api/admin/catalog/[id] PATCH error:", error)
    return NextResponse.json({ error: "Erro ao atualizar item." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

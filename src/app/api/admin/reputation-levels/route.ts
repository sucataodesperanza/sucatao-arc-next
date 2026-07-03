import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("reputation_levels")
    .select("name, min_points, position, color")
    .order("position")

  return NextResponse.json({ levels: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => ({}))
  const { position, name, min_points } = body as { position?: number; name?: string; min_points?: number }

  if (typeof position !== "number") {
    return NextResponse.json({ error: "position é obrigatório." }, { status: 400 })
  }
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "name não pode ser vazio." }, { status: 400 })
  }
  if (min_points !== undefined && (typeof min_points !== "number" || min_points < 0)) {
    return NextResponse.json({ error: "min_points deve ser ≥ 0." }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (name      !== undefined) update.name       = name.trim()
  if (min_points !== undefined) update.min_points = min_points

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("reputation_levels")
    .update(update)
    .eq("position", position)

  if (error) return NextResponse.json({ error: "Erro ao salvar nível." }, { status: 500 })

  return NextResponse.json({ ok: true })
}

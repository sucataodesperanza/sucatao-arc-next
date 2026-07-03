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
  const { position, name, min_points, color } = body as {
    position?: number; name?: string; min_points?: number; color?: string
  }

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
  if (color     !== undefined) update.color      = color

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

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => ({}))
  const { name, min_points, color } = body as { name?: string; min_points?: number; color?: string }

  if (!name?.trim()) {
    return NextResponse.json({ error: "name é obrigatório." }, { status: 400 })
  }
  if (typeof min_points !== "number" || min_points < 0) {
    return NextResponse.json({ error: "min_points inválido." }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from("reputation_levels")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)

  const nextPosition = ((existing?.[0] as { position: number } | undefined)?.position ?? -1) + 1

  const { error } = await supabase
    .from("reputation_levels")
    .insert({ name: name.trim(), min_points, color: color ?? "#566171", position: nextPosition })

  if (error) return NextResponse.json({ error: "Erro ao criar nível." }, { status: 500 })

  return NextResponse.json({ ok: true, position: nextPosition })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => ({}))
  const { position } = body as { position?: number }

  if (typeof position !== "number") {
    return NextResponse.json({ error: "position é obrigatório." }, { status: 400 })
  }
  if (position === 0) {
    return NextResponse.json({ error: "O nível base (0) não pode ser removido." }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error: delError } = await supabase
    .from("reputation_levels")
    .delete()
    .eq("position", position)

  if (delError) return NextResponse.json({ error: "Erro ao remover nível." }, { status: 500 })

  // Renumera posições acima do removido (ordem crescente evita conflito de unique)
  const { data: higher } = await supabase
    .from("reputation_levels")
    .select("name, position")
    .gt("position", position)
    .order("position", { ascending: true })

  for (const l of (higher ?? []) as { name: string; position: number }[]) {
    await supabase
      .from("reputation_levels")
      .update({ position: l.position - 1 })
      .eq("name", l.name)
  }

  return NextResponse.json({ ok: true })
}

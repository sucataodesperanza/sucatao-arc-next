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
  const { name, min_points } = body as { name?: string; min_points?: number }

  if (!name || typeof min_points !== "number" || min_points < 0) {
    return NextResponse.json({ error: "name e min_points (≥ 0) são obrigatórios." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("reputation_levels")
    .update({ min_points })
    .eq("name", name)

  if (error) return NextResponse.json({ error: "Erro ao salvar nível." }, { status: 500 })

  return NextResponse.json({ ok: true })
}

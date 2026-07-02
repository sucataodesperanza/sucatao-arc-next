import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return null
  return user
}

// GET /api/admin/expedicao — lista todas as expedições
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("expeditions")
    .select("*, expedition_vault_packs(packs_count, total_slots)")
    .order("starts_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const expeditions = (data ?? []).map(e => {
    const packs = e.expedition_vault_packs as Array<{ packs_count: number; total_slots: number }> | null
    const totalPacks = (packs ?? []).reduce((s, p) => s + p.packs_count, 0)
    const totalSlots = (packs ?? []).reduce((s, p) => s + p.total_slots, 0)
    const buyers    = (packs ?? []).length
    const { expedition_vault_packs: _, ...rest } = e
    return { ...rest, totalPacks, totalSlots, buyers }
  })

  return NextResponse.json(expeditions)
}

// POST /api/admin/expedicao — cria nova expedição
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, description, starts_at, ends_at, status, slots_per_pack } = body

  if (!name?.trim() || !starts_at || !ends_at) {
    return NextResponse.json({ error: "name, starts_at e ends_at são obrigatórios." }, { status: 400 })
  }

  if (new Date(ends_at) <= new Date(starts_at)) {
    return NextResponse.json({ error: "ends_at deve ser posterior a starts_at." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("expeditions")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      starts_at,
      ends_at,
      status: status ?? "scheduled",
      slots_per_pack: typeof slots_per_pack === "number" ? slots_per_pack : 20,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

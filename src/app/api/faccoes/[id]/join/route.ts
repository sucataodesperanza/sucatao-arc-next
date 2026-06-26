import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Verifica se usuário já tem facção (SELECT — coberto pela policy existente)
  const { data: existing } = await supabase
    .from("user_factions")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "Você já possui uma facção. A escolha é permanente.", code: "already_joined" }, { status: 409 })
  }

  // Verifica se a facção existe e está ativa
  const { data: faction } = await supabase
    .from("factions")
    .select("id")
    .eq("id", id)
    .eq("active", true)
    .single()

  if (!faction) return NextResponse.json({ error: "Facção não encontrada." }, { status: 404 })

  // INSERT via admin client — RLS só tem policy SELECT, admin bypassa
  const admin = createAdminClient()
  const { error } = await admin
    .from("user_factions")
    .insert({ user_id: user.id, faction_id: id })

  if (error) return NextResponse.json({ error: "Erro ao ingressar na facção." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

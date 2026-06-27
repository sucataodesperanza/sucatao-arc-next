import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Verifica se contrato existe e está ativo
  const { data: contract } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", id)
    .eq("active", true)
    .single()

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 })

  // Verifica se já aceitou
  const { data: existing } = await supabase
    .from("user_contracts")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("contract_id", id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "Você já aceitou este contrato.", code: "already_accepted" }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("user_contracts")
    .insert({ user_id: user.id, contract_id: id, progress: 0, status: "active" })

  if (error) return NextResponse.json({ error: "Erro ao aceitar contrato." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Verifica se o trade existe e está ativo
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status")
    .eq("id", id)
    .eq("status", "active")
    .single()

  if (!trade) return NextResponse.json({ error: "Trade não encontrado ou inativo." }, { status: 404 })

  const { error } = await supabase
    .from("trade_acceptances")
    .insert({ trade_id: id, user_id: user.id, status: "pending" })

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Você já aceitou este trade." }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao aceitar trade." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

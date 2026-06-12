import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isValidCpf, onlyDigits } from "@/lib/cpf"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : ""
  const cpfRequired = typeof body.cpf === "string" && body.cpf.length > 0

  if (!gameId) {
    return NextResponse.json({ error: "Informe seu ID do jogo." }, { status: 400 })
  }

  const updates: Record<string, string> = { game_id: gameId }

  if (cpfRequired) {
    const cpf = onlyDigits(body.cpf)
    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: "Informe um CPF válido." }, { status: 400 })
    }
    updates.cpf = cpf
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select("id")
  if (error) {
    return NextResponse.json({ error: "Erro ao salvar seu cadastro.", detail: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Não foi possível salvar seu cadastro.", detail: "Nenhuma linha de profiles foi atualizada (verifique a policy de UPDATE)." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

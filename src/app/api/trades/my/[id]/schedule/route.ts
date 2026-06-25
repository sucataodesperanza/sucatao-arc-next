import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const scheduled_at: string = body.scheduled_at  // ISO datetime: "2026-06-25T15:00:00"
  const game_id: string = body.game_id?.trim() ?? ""

  if (!scheduled_at) return NextResponse.json({ error: "scheduled_at é obrigatório." }, { status: 400 })

  // Verifica que a aceitação pertence ao usuário e está pendente
  const { data: acceptance } = await supabase
    .from("trade_acceptances")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!acceptance) return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 })
  if (acceptance.status === "completed") return NextResponse.json({ error: "Trade já concluído." }, { status: 409 })

  // Verifica conflito de horário (só 1 por vez)
  const { data: conflict } = await supabase
    .from("trade_acceptances")
    .select("id")
    .eq("scheduled_at", scheduled_at)
    .neq("status", "cancelled")
    .neq("id", id)
    .single()

  if (conflict) return NextResponse.json({ error: "Este horário já está ocupado. Escolha outro." }, { status: 409 })

  const { error } = await supabase
    .from("trade_acceptances")
    .update({ scheduled_at, game_id: game_id || null, status: "scheduled" })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: "Erro ao agendar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

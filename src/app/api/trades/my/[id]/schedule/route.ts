import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const slot_id: string = body.slot_id
  const game_id: string = body.game_id?.trim() ?? ""

  if (!slot_id) return NextResponse.json({ error: "slot_id é obrigatório." }, { status: 400 })

  // Verifica que a aceitação pertence ao usuário e está pending
  const { data: acceptance } = await supabase
    .from("trade_acceptances")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!acceptance) return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 })
  if (acceptance.status === "completed") return NextResponse.json({ error: "Trade já concluído." }, { status: 409 })

  // Verifica capacidade do slot
  const { count } = await supabase
    .from("trade_acceptances")
    .select("id", { count: "exact" })
    .eq("slot_id", slot_id)
    .neq("status", "cancelled")

  const { data: slot } = await supabase
    .from("trade_slots")
    .select("capacity")
    .eq("id", slot_id)
    .eq("active", true)
    .single()

  if (!slot) return NextResponse.json({ error: "Slot inválido ou inativo." }, { status: 400 })
  if ((count ?? 0) >= slot.capacity) return NextResponse.json({ error: "Slot lotado. Escolha outro horário." }, { status: 409 })

  const { data: updated, error } = await supabase
    .from("trade_acceptances")
    .update({ slot_id, game_id: game_id || null, status: "scheduled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")

  if (error) return NextResponse.json({ error: "Erro ao agendar." }, { status: 500 })
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Não foi possível salvar o agendamento. Verifique as permissões." }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}

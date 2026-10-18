import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { drawSorteio } from "@/lib/sorteios-draw"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const quantity = Math.max(1, Math.min(50, Number(body.quantity) || 1))

  const admin = createAdminClient()

  // Busca sorteio e perfil em paralelo
  const [{ data: sorteio }, { data: profile }] = await Promise.all([
    admin.from("sorteios").select("id, status, ticket_price, max_tickets, tickets_sold, ends_at").eq("id", id).single(),
    supabase.from("profiles").select("points").eq("id", user.id).single(),
  ])

  if (!sorteio) return NextResponse.json({ error: "Sorteio não encontrado." }, { status: 404 })
  if (sorteio.status !== "active") return NextResponse.json({ error: "Sorteio não está ativo." }, { status: 400 })
  if (new Date(sorteio.ends_at) <= new Date()) return NextResponse.json({ error: "Sorteio encerrado." }, { status: 400 })

  const available = sorteio.max_tickets - sorteio.tickets_sold
  if (available <= 0) return NextResponse.json({ error: "Todos os tickets foram vendidos." }, { status: 400 })

  const qty = Math.min(quantity, available)
  const totalCost = sorteio.ticket_price * qty
  const currentPoints = profile?.points ?? 0

  if (currentPoints < totalCost) {
    return NextResponse.json({ error: `Pontos insuficientes. Necessário: ${totalCost}, disponível: ${currentPoints}.` }, { status: 400 })
  }

  // Debita pontos primeiro
  const { error: debitError } = await supabase
    .from("profiles")
    .update({ points: currentPoints - totalCost })
    .eq("id", user.id)

  if (debitError) return NextResponse.json({ error: "Erro ao debitar pontos." }, { status: 500 })

  // Compra atômica dos tickets via RPC
  const { data: tickets, error: ticketError } = await admin.rpc("buy_sorteio_tickets", {
    p_sorteio_id: id,
    p_user_id:    user.id,
    p_quantity:   qty,
  })

  if (ticketError) {
    // Estorna pontos em caso de falha
    await supabase.from("profiles").update({ points: currentPoints }).eq("id", user.id)
    return NextResponse.json({ error: ticketError.message }, { status: 500 })
  }

  const newTicketNumbers: number[] = (tickets ?? []).map((t: { ticket_number: number }) => t.ticket_number)
  const newPoints = currentPoints - totalCost

  // Verifica se sorteio foi completado
  const soldAfter = sorteio.tickets_sold + qty
  if (soldAfter >= sorteio.max_tickets) {
    await drawSorteio(id, admin)
  }

  return NextResponse.json({ ok: true, tickets: newTicketNumbers, points: newPoints, quantity: qty })
}

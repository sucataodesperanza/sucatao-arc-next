import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkAndDrawExpired } from "@/lib/sorteios-draw"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()

  // Lazy draw de sorteios expirados
  await checkAndDrawExpired(admin)

  // Busca todos os sorteios
  const { data: sorteios } = await admin
    .from("sorteios")
    .select("*")
    .order("created_at", { ascending: false })

  if (!sorteios?.length) {
    return NextResponse.json({ active: null, others: [], user_points: 0 })
  }

  // Tickets do usuário logado
  let userTicketMap: Record<string, number[]> = {}
  if (user) {
    const { data: tickets } = await admin
      .from("sorteio_tickets")
      .select("sorteio_id, ticket_number")
      .eq("user_id", user.id)
      .in("sorteio_id", sorteios.map(s => s.id))

    for (const t of tickets ?? []) {
      if (!userTicketMap[t.sorteio_id]) userTicketMap[t.sorteio_id] = []
      userTicketMap[t.sorteio_id].push(t.ticket_number)
    }
  }

  // Pontos do usuário
  let userPoints = 0
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single()
    userPoints = profile?.points ?? 0
  }

  const enriched = sorteios.map(s => ({
    ...s,
    user_tickets: userTicketMap[s.id] ?? [],
  }))

  const active = enriched.find(s => s.status === "active") ?? null
  const others = enriched.filter(s => s.id !== active?.id)

  return NextResponse.json({ active, others, user_points: userPoints })
}

import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

export async function drawSorteio(sorteioId: string, admin: AdminClient) {
  const { data: sorteio } = await admin
    .from("sorteios")
    .select("id, status, max_tickets, tickets_sold")
    .eq("id", sorteioId)
    .single()

  if (!sorteio || sorteio.status !== "active") return

  const { data: tickets } = await admin
    .from("sorteio_tickets")
    .select("ticket_number, user_id")
    .eq("sorteio_id", sorteioId)

  if (!tickets?.length) return

  const winner = tickets[Math.floor(Math.random() * tickets.length)]

  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("id", winner.user_id)
    .single()

  await admin.from("sorteios").update({
    status:        "finished",
    winner_id:     winner.user_id,
    winner_ticket: winner.ticket_number,
    winner_name:   profile?.name ?? null,
    drawn_at:      new Date().toISOString(),
  }).eq("id", sorteioId)
}

export async function checkAndDrawExpired(admin: AdminClient) {
  const { data: active } = await admin
    .from("sorteios")
    .select("id, tickets_sold, max_tickets, ends_at")
    .eq("status", "active")

  if (!active?.length) return

  const now = new Date()
  const expired = active.filter(s =>
    s.tickets_sold >= s.max_tickets || new Date(s.ends_at) <= now
  )

  await Promise.all(expired.map(s => drawSorteio(s.id, admin)))
}

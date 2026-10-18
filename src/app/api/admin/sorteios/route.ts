import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()
  const { data } = await admin
    .from("sorteios")
    .select("*")
    .order("created_at", { ascending: false })

  return NextResponse.json({ sorteios: data ?? [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => ({}))
  const { title, description, image_url, badge, badge_color, ticket_price, max_tickets, starts_at, ends_at } = body

  if (!title || !ticket_price || !max_tickets || !starts_at || !ends_at) {
    return NextResponse.json({ error: "Campos obrigatórios: título, preço, máx. tickets, início e fim." }, { status: 400 })
  }

  const now = new Date()
  const status = new Date(starts_at) <= now ? "active" : "upcoming"

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("sorteios")
    .insert({
      title,
      description:  description || null,
      image_url:    image_url || null,
      badge:        badge || null,
      badge_color:  badge_color || "purple",
      ticket_price: Number(ticket_price),
      max_tickets:  Number(max_tickets),
      starts_at,
      ends_at,
      status,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sorteio: data })
}

import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("trade_slots")
    .select("*")
    .order("scheduled_for")

  return NextResponse.json({ slots: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const { label, scheduled_for, capacity } = body

  if (!label || !scheduled_for) {
    return NextResponse.json({ error: "label e scheduled_for são obrigatórios." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("trade_slots")
    .insert({ label, scheduled_for, capacity: capacity ?? 1, active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Erro ao criar slot." }, { status: 500 })
  return NextResponse.json({ slot: data })
}

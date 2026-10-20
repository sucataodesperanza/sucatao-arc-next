import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { defaultTradeHours, validateTradeHours } from "@/lib/trade-scheduling"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("trade_settings")
    .select("operating_hours_start, operating_hours_end, slot_duration_minutes")
    .eq("id", 1)
    .single()

  return NextResponse.json(data ?? { operating_hours_start: "09:00", operating_hours_end: "00:00", slot_duration_minutes: 5 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.operating_hours_start === "string") update.operating_hours_start = body.operating_hours_start
  if (typeof body.operating_hours_end   === "string") update.operating_hours_end   = body.operating_hours_end
  if (typeof body.slot_duration_minutes === "number") update.slot_duration_minutes = body.slot_duration_minutes

  const supabase = createAdminClient()
  const current = await supabase.from("trade_settings").select("operating_hours_start, operating_hours_end, slot_duration_minutes").eq("id", 1).maybeSingle()
  if (current.error) return NextResponse.json({ error: "Não foi possível ler a configuração atual." }, { status: 503 })
  const hours = { ...(current.data ?? defaultTradeHours), ...update }
  if (!validateTradeHours(hours)) return NextResponse.json({ error: "Informe horários válidos e intervalo de 1 a 1.440 minutos." }, { status: 400 })
  const { error } = await supabase.from("trade_settings").upsert({ id: 1, ...update })
  if (error) return NextResponse.json({ error: "Não foi possível salvar o horário." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

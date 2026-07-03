import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(m: number) {
  const totalMin = ((m % 1440) + 1440) % 1440
  const h   = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

// GET /api/expeditions/vault-deposit/available-times?date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get("date") // YYYY-MM-DD

  if (!date) return NextResponse.json({ times: [], maxDate: null })

  const supabase = await createClient()
  const admin    = createAdminClient()
  const now      = new Date().toISOString()

  // Expedição ativa — para saber o ends_at
  const { data: expedition } = await admin
    .from("expeditions")
    .select("id, ends_at")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1)
    .maybeSingle()

  if (!expedition) return NextResponse.json({ times: [], maxDate: null })

  const maxDate = expedition.ends_at.slice(0, 10)

  // Horários de funcionamento (reutiliza trade_settings)
  const { data: settings } = await supabase
    .from("trade_settings")
    .select("operating_hours_start, operating_hours_end, slot_duration_minutes")
    .eq("id", 1)
    .single()

  const start    = settings?.operating_hours_start ?? "09:00"
  const end      = settings?.operating_hours_end   ?? "00:00"
  const duration = settings?.slot_duration_minutes ?? 30

  let startMin = timeToMinutes(start)
  let endMin   = timeToMinutes(end)
  if (endMin <= startMin) endMin += 1440

  // Slots já ocupados neste dia
  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`
  const { data: booked } = await admin
    .from("expedition_vault_deposits")
    .select("preferred_at")
    .eq("expedition_id", expedition.id)
    .gte("preferred_at", dayStart)
    .lte("preferred_at", dayEnd)
    .neq("status", "cancelled")

  const bookedTimes = new Set(
    (booked ?? []).map(b => b.preferred_at?.slice(11, 16))
  )

  const nowDt = new Date()
  const times: string[] = []

  for (let m = startMin; m < endMin; m += duration) {
    const time   = minutesToTime(m)
    const slotDt = new Date(`${date}T${time}:00`)
    if (slotDt <= nowDt)        continue
    if (bookedTimes.has(time))  continue
    times.push(time)
  }

  return NextResponse.json({ times, maxDate })
}

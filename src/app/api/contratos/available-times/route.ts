import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(m: number) {
  const totalMin = ((m % 1440) + 1440) % 1440
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const date = searchParams.get("date") // YYYY-MM-DD

  if (!date) return NextResponse.json({ times: [] })

  const supabase = await createClient()

  // Reutiliza a configuração de horário definida no painel de trades
  const { data: settings } = await supabase
    .from("trade_settings")
    .select("operating_hours_start, operating_hours_end, slot_duration_minutes")
    .eq("id", 1)
    .single()

  const start    = settings?.operating_hours_start ?? "09:00"
  const end      = settings?.operating_hours_end   ?? "00:00"
  const duration = settings?.slot_duration_minutes ?? 60

  let startMin = timeToMinutes(start)
  let endMin   = timeToMinutes(end)
  if (endMin <= startMin) endMin += 1440

  // Horários já reservados em contract_schedules (apenas status=scheduled)
  const dayStart = `${date}T00:00:00`
  const dayEnd   = `${date}T23:59:59`
  const { data: booked } = await supabase
    .from("contract_schedules")
    .select("scheduled_at")
    .gte("scheduled_at", dayStart)
    .lte("scheduled_at", dayEnd)
    .eq("status", "scheduled")

  const bookedTimes = new Set(
    (booked ?? []).map(b => b.scheduled_at?.slice(11, 16))
  )

  const now    = new Date()
  const times: string[] = []

  for (let m = startMin; m < endMin; m += duration) {
    const time   = minutesToTime(m)
    const slotDt = new Date(`${date}T${time}:00`)
    if (slotDt <= now) continue
    if (bookedTimes.has(time)) continue
    times.push(time)
  }

  return NextResponse.json({ times, date })
}

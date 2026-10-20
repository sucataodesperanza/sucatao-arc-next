export const TRADE_TIME_ZONE = "America/Cuiaba"
export type TradeHours = { operating_hours_start: string; operating_hours_end: string; slot_duration_minutes: number }
export type TradeSlot = { id: string; label: string; scheduled_for: string; capacity: number; booked: number }
export const defaultTradeHours: TradeHours = { operating_hours_start: "09:00", operating_hours_end: "00:00", slot_duration_minutes: 5 }

export function tradeDate(value: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TRADE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value))
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return part("year") + "-" + part("month") + "-" + part("day")
}

export function validateTradeHours(value: TradeHours): boolean {
  return [value.operating_hours_start, value.operating_hours_end].every(t => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::00(?:\.0+)?)?$/.test(t)) && Number.isInteger(value.slot_duration_minutes) && value.slot_duration_minutes >= 1 && value.slot_duration_minutes <= 1440
}

export function generateTradeSlots(hours: TradeHours, now = new Date(), days = 7): TradeSlot[] {
  if (!validateTradeHours(hours)) throw new Error("Horário de funcionamento inválido. Revise em Admin → Trades.")
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const start = minutes(hours.operating_hours_start)
  let end = minutes(hours.operating_hours_end)
  if (end <= start) end += 1440
  // Cuiabá uses UTC-04:00. Explicit offset prevents the server/browser timezone changing appointments.
  const midnight = new Date(tradeDate(now) + "T00:00:00-04:00").getTime()
  const slots: TradeSlot[] = []
  // Include the previous opening day when an overnight window extends into today.
  for (let day = -1; day < days; day++) {
    for (let minute = start; minute < end; minute += hours.slot_duration_minutes) {
      const timestamp = midnight + (day * 1440 + minute) * 60000
      if (timestamp <= now.getTime() || timestamp >= midnight + days * 86400000) continue
      const scheduled_for = new Date(timestamp).toISOString()
      slots.push({ id: "daily:" + scheduled_for, scheduled_for, label: new Date(timestamp).toLocaleString("pt-BR", { timeZone: TRADE_TIME_ZONE, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), capacity: 1, booked: 0 })
    }
  }
  return slots.sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
}

export function availableTradeSlots(slots: TradeSlot[], booked: { scheduled_at: string | null }[]): TradeSlot[] {
  const occupied = new Set(booked.filter(b => b.scheduled_at).map(b => new Date(b.scheduled_at!).getTime()))
  return slots.filter(slot => !occupied.has(new Date(slot.scheduled_for).getTime()))
}

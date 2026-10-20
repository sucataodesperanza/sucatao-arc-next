import { createAdminClient } from "@/lib/supabase/admin"
import { availableTradeSlots, defaultTradeHours, generateTradeSlots } from "@/lib/trade-scheduling"

export async function readTradeAvailability(now = new Date()) {
  const admin = createAdminClient()
  const settings = await admin.from("trade_settings").select("operating_hours_start, operating_hours_end, slot_duration_minutes").eq("id", 1).maybeSingle()
  if (settings.error) throw new Error("Não foi possível carregar o horário de funcionamento. Tente novamente.")
  const slots = generateTradeSlots(settings.data ?? defaultTradeHours, now)
  if (!slots.length) return []
  const booked: { scheduled_at: string | null }[] = []
  for (let page = 0; ; page++) {
    const result = await admin.from("trade_acceptances").select("scheduled_at, id")
      .neq("status", "cancelled")
      .gte("scheduled_at", slots[0].scheduled_for)
      .lte("scheduled_at", slots[slots.length - 1].scheduled_for)
      .order("id").range(page * 500, page * 500 + 499)
    if (result.error) throw new Error("Não foi possível conferir os agendamentos. Tente novamente.")
    booked.push(...(result.data ?? []))
    if ((result.data?.length ?? 0) < 500) break
  }
  // Service-role read sees reservations from every customer, without exposing identities.
  return availableTradeSlots(slots, booked)
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type TradeSlot = {
  id: string
  label: string
  scheduled_for: string
  capacity: number
  booked: number
}

export async function GET() {
  const supabase = await createClient()

  // Slots ativos com data futura
  const { data: slots, error } = await supabase
    .from("trade_slots")
    .select("id, label, scheduled_for, capacity")
    .eq("active", true)
    .gte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")

  if (error) return NextResponse.json({ slots: [] })

  // Conta quantas aceitações já estão em cada slot
  const ids = (slots ?? []).map(s => s.id)
  const { data: counts } = await supabase
    .from("trade_acceptances")
    .select("slot_id")
    .in("slot_id", ids)
    .neq("status", "cancelled")

  const bookedMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    if (row.slot_id) bookedMap[row.slot_id] = (bookedMap[row.slot_id] ?? 0) + 1
  }

  const result: TradeSlot[] = (slots ?? []).map(s => ({
    ...s,
    booked: bookedMap[s.id] ?? 0,
  })).filter(s => s.booked < s.capacity)

  return NextResponse.json({ slots: result })
}

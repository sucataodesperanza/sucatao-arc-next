import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
  await supabase.from("trade_settings").upsert({ id: 1, ...update })
  return NextResponse.json({ ok: true })
}

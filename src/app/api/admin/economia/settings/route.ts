import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const admin = createAdminClient()
  const { data } = await admin.from("economy_settings").select("*").eq("id", 1).single()
  return NextResponse.json(data ?? { points_multiplier: 100, cash_multiplier: 0.10 })
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.points_multiplier !== undefined) update.points_multiplier = body.points_multiplier
  if (body.cash_multiplier   !== undefined) update.cash_multiplier   = body.cash_multiplier
  await admin.from("economy_settings").upsert({ id: 1, ...update })
  return NextResponse.json({ ok: true })
}

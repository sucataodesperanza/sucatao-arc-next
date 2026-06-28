import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = await createClient()
  const { data } = await supabase
    .from("contract_point_rewards")
    .select("id, points_threshold, active, position, catalog_items(id, name, icon_url, rarity)")
    .order("points_threshold", { ascending: true })

  return NextResponse.json({ rewards: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("contract_point_rewards")
    .insert({ item_id: body.item_id, points_threshold: body.points_threshold, active: body.active ?? true })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

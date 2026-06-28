import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()
  const { data: groups } = await admin
    .from("contract_groups")
    .select("id, faction_id, title, description, type, starts_at, expires_at, active, image_url, price_points, price_real, factions(name, color)")
    .order("created_at", { ascending: false })

  return NextResponse.json({ groups: groups ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("contract_groups")
    .insert({
      faction_id:  body.faction_id,
      title:       body.title,
      description: body.description ?? "",
      type:        body.type,
      starts_at:   body.starts_at,
      expires_at:  body.expires_at,
      active:      body.active ?? true,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

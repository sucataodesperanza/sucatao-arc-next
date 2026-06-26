import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("factions")
    .select("id, slug, name, tagline, description, color, icon_url, bonuses, attributes, active, position")
    .order("position", { ascending: true })
  return NextResponse.json({ factions: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("factions")
    .insert({
      slug:        body.slug,
      name:        body.name,
      tagline:     body.tagline     ?? "",
      description: body.description ?? "",
      color:       body.color       ?? "#ffffff",
      bonuses:     body.bonuses     ?? [],
      active:      body.active      ?? true,
      position:    body.position    ?? 99,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

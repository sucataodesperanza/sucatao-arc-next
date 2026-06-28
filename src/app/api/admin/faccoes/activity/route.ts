import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("faction_activity")
    .select("id, text, created_at, factions(id, name, color, slug)")
    .order("created_at", { ascending: false })
    .limit(30)
  return NextResponse.json({ activity: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  if (!body.faction_id || !body.text) {
    return NextResponse.json({ error: "faction_id e text são obrigatórios." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("faction_activity")
    .insert({ faction_id: body.faction_id, text: body.text })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

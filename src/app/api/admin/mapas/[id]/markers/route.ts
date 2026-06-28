import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("map_markers").select("*").eq("map_id", id).order("created_at")
  return NextResponse.json({ markers: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin.from("map_markers").insert({
    map_id: id,
    type:   body.type  ?? "loot",
    x:      body.x     ?? 50,
    y:      body.y     ?? 50,
    title:  body.title ?? "",
    note:   body.note  ?? "",
    active: true,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

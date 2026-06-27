import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = await createClient()
  const { data } = await supabase.from("maps").select("*").order("index", { ascending: true })
  return NextResponse.json({ maps: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin.from("maps").insert({
    id:          body.id,
    name:        body.name,
    label:       body.label        ?? "",
    description: body.description  ?? "",
    image_url:   body.image_url    ?? null,
    status:      body.status       ?? "pending",
    index:       body.index        ?? 99,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

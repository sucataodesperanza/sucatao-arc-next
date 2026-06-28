import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const supabase = await createClient()
  const [newsRes, slidesRes] = await Promise.all([
    supabase.from("home_news").select("*").order("position"),
    supabase.from("home_slides").select("*").order("position"),
  ])
  return NextResponse.json({ news: newsRes.data ?? [], slides: slidesRes.data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const table = body.type === "slide" ? "home_slides" : "home_news"
  delete body.type
  const { data, error } = await admin.from(table).insert(body).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

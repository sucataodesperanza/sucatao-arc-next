import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const admin = createAdminClient()
  const { data } = await admin.from("streamers").select("*").order("position")
  return NextResponse.json({ streamers: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const { data, error } = await admin.from("streamers").insert({
    name: body.name, platform: body.platform ?? "twitch",
    channel_url: body.channel_url ?? null, avatar_url: body.avatar_url ?? null,
    viewers_text: body.viewers_text ?? "", verified: body.verified ?? false,
    active: body.active ?? true, position: body.position ?? 99, color: body.color ?? "#5fa8ff",
  }).select("id").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("streamer_applications")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("admin/streamers/applications GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ applications: data ?? [] })
}

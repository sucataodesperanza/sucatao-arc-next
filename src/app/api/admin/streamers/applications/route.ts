import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const admin = createAdminClient()
  const { data } = await admin
    .from("streamer_applications")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
  return NextResponse.json({ applications: data ?? [] })
}

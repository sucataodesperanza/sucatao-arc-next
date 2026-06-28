import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const admin = createAdminClient()
  const { data } = await admin.from("item_economics").select("item_id, vei").order("vei", { ascending: false })
  return NextResponse.json({ data: data ?? [] })
}

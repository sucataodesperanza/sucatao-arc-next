import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()

  const { data } = await supabase
    .from("reputation_history")
    .select("id, amount, reason, source, ref_id, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ history: data ?? [] })
}

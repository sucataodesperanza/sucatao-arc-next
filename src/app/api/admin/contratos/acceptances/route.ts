import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const contractId = request.nextUrl.searchParams.get("contract_id")

  const admin = createAdminClient()
  let query = admin
    .from("user_contracts")
    .select("id, progress, status, accepted_at, completed_at, user_id, contract_id, contracts(title, total, sucatas, type, tier)")
    .order("accepted_at", { ascending: false })

  if (contractId) query = query.eq("contract_id", contractId)

  const { data } = await query

  // Busca perfis
  const userIds = [...new Set((data ?? []).map(a => a.user_id))]
  let profiles: { id: string; name: string | null }[] = []
  if (userIds.length > 0) {
    const supabase = await createClient()
    const { data: p } = await supabase.from("profiles").select("id, name").in("id", userIds)
    profiles = p ?? []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name]))

  const result = (data ?? []).map(a => ({ ...a, user_name: profileMap[a.user_id] ?? a.user_id.slice(0, 8) }))
  return NextResponse.json({ acceptances: result })
}

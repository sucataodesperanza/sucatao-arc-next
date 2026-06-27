import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Lista progresso de todos os usuários em um grupo
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()

  const { data: completions } = await admin
    .from("user_mission_completions")
    .select("id, user_id, mission_id, points_credited, completed_at, contract_group_missions(position, title)")
    .eq("group_id", id)
    .order("completed_at", { ascending: false })

  // Busca perfis dos usuários
  const userIds = [...new Set((completions ?? []).map(c => c.user_id))]
  let profiles: { id: string; name: string | null }[] = []
  if (userIds.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, name").in("id", userIds)
    profiles = p ?? []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name ?? p.id.slice(0, 8)]))

  const result = (completions ?? []).map(c => ({
    ...c,
    user_name: profileMap[c.user_id] ?? c.user_id.slice(0, 8),
  }))

  return NextResponse.json({ completions: result })
}

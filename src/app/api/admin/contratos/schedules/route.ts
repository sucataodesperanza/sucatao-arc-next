import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()

  const { data } = await admin
    .from("contract_mission_schedules")
    .select(`
      id, scheduled_at, game_id, status, expires_at, created_at,
      user_id, mission_id, group_id,
      contract_group_missions(position, title, points_reward, item_reward),
      contract_groups(title, type)
    `)
    .in("status", ["scheduled", "pending"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })

  // Busca nomes dos usuários
  const userIds = [...new Set((data ?? []).map(s => s.user_id))]
  let profiles: { id: string; name: string | null }[] = []
  if (userIds.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, name").in("id", userIds)
    profiles = p ?? []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name ?? p.id.slice(0, 8)]))

  const result = (data ?? []).map(s => ({ ...s, user_name: profileMap[s.user_id] }))
  return NextResponse.json({ schedules: result })
}

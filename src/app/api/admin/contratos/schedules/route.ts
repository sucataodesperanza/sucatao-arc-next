import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()

  // Agendamentos do sistema antigo (passes)
  const [passSchedulesRes, contractSchedulesRes] = await Promise.all([
    admin
      .from("contract_mission_schedules")
      .select(`
        id, scheduled_at, game_id, status, expires_at, created_at,
        user_id, mission_id, group_id,
        contract_group_missions(position, title, points_reward, item_reward),
        contract_groups(title, type)
      `)
      .in("status", ["scheduled", "pending"])
      .order("scheduled_at", { ascending: true, nullsFirst: false }),

    admin
      .from("contract_schedules")
      .select(`
        id, scheduled_at, game_id, status, created_at,
        user_id, contract_id, objective_index,
        contracts(title, sucatas, mission_type, contract_type, objectives)
      `)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
  ])

  const passSchedules  = (passSchedulesRes.data  ?? []).map(s => ({ ...s, _source: "pass"     as const }))
  const contractScheds = (contractSchedulesRes.data ?? []).map(s => {
    const contracts = s.contracts as unknown as { title: string; sucatas: number; mission_type: string; objectives: any[] } | null
    const obj = contracts?.objectives?.[s.objective_index] as { text?: string } | undefined
    return {
      ...s,
      _source: "contract" as const,
      expires_at: null,
      // Campos compatíveis com o antigo para o admin page renderizar
      contract_group_missions: null,
      contract_groups: null,
      // Campos novos
      objective_title: obj?.text ?? `Objetivo ${s.objective_index + 1}`,
    }
  })

  // Coleta user IDs de ambas as listas
  const allSchedules = [...passSchedules, ...contractScheds]
  const userIds = [...new Set(allSchedules.map(s => s.user_id))]

  let profiles: { id: string; name: string | null }[] = []
  if (userIds.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, name").in("id", userIds)
    profiles = p ?? []
  }
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.name ?? p.id.slice(0, 8)]))

  const result = allSchedules.map(s => ({ ...s, user_name: profileMap[s.user_id] }))

  // Ordena por scheduled_at
  result.sort((a, b) => {
    if (!a.scheduled_at && !b.scheduled_at) return 0
    if (!a.scheduled_at) return 1
    if (!b.scheduled_at) return -1
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  })

  return NextResponse.json({ schedules: result })
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()

  // Todos os user_contracts ativos com dados do contrato
  const { data: uc } = await admin
    .from("user_contracts")
    .select("id, user_id, contract_id, status, objectives_progress, accepted_at, discord_channel_id, contracts(id, title, mission_type, tier, image_url, objectives)")
    .eq("status", "active")
    .order("accepted_at", { ascending: false })

  if (!uc || uc.length === 0) return NextResponse.json({ contracts: [] })

  // Busca perfis
  const userIds = [...new Set(uc.map(a => a.user_id))]
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, discord_id, discord_username")
    .in("id", userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  // Busca agendamentos ativos (não cancelados)
  const contractIds = [...new Set(uc.map(a => a.contract_id as string))]
  const { data: schedules } = await admin
    .from("contract_schedules")
    .select("id, user_id, contract_id, objective_index, scheduled_at, game_id, status")
    .in("contract_id", contractIds)
    .in("user_id", userIds)
    .neq("status", "cancelled")

  const scheduleList = schedules ?? []

  // Agrupa por contrato
  const contractMap = new Map<string, {
    id: string; title: string; mission_type: string; tier: string; image_url: string | null; objectives: unknown[]
    players: {
      uc_id: string; user_id: string; user_name: string; discord_id: string | null
      objectives_progress: Record<string, number>; accepted_at: string; discord_channel_id: string | null
      schedules: { id: string; objective_index: number; scheduled_at: string | null; game_id: string | null; status: string }[]
    }[]
  }>()

  for (const a of uc) {
    const contract = a.contracts as unknown as { id: string; title: string; mission_type: string; tier: string; image_url: string | null; objectives: unknown[] } | null
    if (!contract) continue

    if (!contractMap.has(contract.id)) {
      contractMap.set(contract.id, {
        id: contract.id, title: contract.title, mission_type: contract.mission_type,
        tier: contract.tier, image_url: contract.image_url, objectives: (contract.objectives as unknown[]) ?? [],
        players: [],
      })
    }

    const profile = profileMap[a.user_id]
    const playerSchedules = scheduleList.filter(s => s.user_id === a.user_id && s.contract_id === contract.id)

    contractMap.get(contract.id)!.players.push({
      uc_id:               a.id,
      user_id:             a.user_id,
      user_name:           profile?.username ?? profile?.discord_username ?? a.user_id.slice(0, 8),
      discord_id:          profile?.discord_id ?? null,
      objectives_progress: (a.objectives_progress as Record<string, number>) ?? {},
      accepted_at:         a.accepted_at,
      discord_channel_id:  a.discord_channel_id ?? null,
      schedules:           playerSchedules,
    })
  }

  return NextResponse.json({ contracts: [...contractMap.values()] })
}

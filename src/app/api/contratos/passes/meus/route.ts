import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Pass, Mission, MissionReward } from "@/app/api/faccoes/recompensas/route"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ passes: [] })

  // Passes comprados (gerais, faction_id IS NULL)
  const { data: purchases } = await supabase
    .from("user_contract_group_purchases")
    .select("group_id, contract_groups(id, title, description, type, starts_at, expires_at, faction_id)")
    .eq("user_id", user.id)

  const generalPurchases = (purchases ?? []).filter(p => {
    const g = p.contract_groups as unknown as { faction_id: string | null } | null
    return g?.faction_id === null
  })

  if (!generalPurchases.length) return NextResponse.json({ passes: [] })

  const groupIds = generalPurchases.map(p => p.group_id)

  // Missões
  const { data: missions } = await supabase
    .from("contract_group_missions")
    .select("id, group_id, position, title, description, total, points_reward, item_reward")
    .in("group_id", groupIds)
    .order("position", { ascending: true })

  // Conclusões do usuário
  const { data: completions } = await supabase
    .from("user_mission_completions")
    .select("mission_id, group_id, completed_at")
    .eq("user_id", user.id)
    .in("group_id", groupIds)

  const completedSet = new Set((completions ?? []).map(c => c.mission_id))
  const completedAtMap = Object.fromEntries((completions ?? []).map(c => [c.mission_id, c.completed_at]))

  // Limite diário (BRT)
  const brtOffsetMs = 3 * 60 * 60 * 1000
  const nowBrt = new Date(Date.now() - brtOffsetMs)
  const todayStartBrt = new Date(nowBrt); todayStartBrt.setHours(0, 0, 0, 0)
  const todayStartUtc = new Date(todayStartBrt.getTime() + brtOffsetMs)
  const nextMidnightUtc = new Date(todayStartUtc.getTime() + 86400000)

  const completedTodayByGroup = new Set<string>()
  for (const c of (completions ?? []) as { mission_id: string; group_id: string; completed_at: string }[]) {
    const at = new Date(c.completed_at)
    if (at >= todayStartUtc && at < nextMidnightUtc) {
      completedTodayByGroup.add(c.group_id)
    }
  }

  // Agendamentos do usuário
  const allMissionIds = (missions ?? []).map(m => m.id)
  const { data: schedules } = allMissionIds.length > 0 ? await supabase
    .from("contract_mission_schedules")
    .select("id, mission_id, scheduled_at, game_id, status, expires_at")
    .eq("user_id", user.id)
    .in("mission_id", allMissionIds) : { data: [] }
  const scheduleMap = Object.fromEntries((schedules ?? []).map(s => [s.mission_id, s]))

  const passes: Pass[] = generalPurchases.map(p => {
    const g = p.contract_groups as unknown as { id: string; title: string; description: string; type: string; starts_at: string; expires_at: string } | null
    if (!g) return null

    const gMissions = (missions ?? []).filter(m => m.group_id === g.id).sort((a, b) => a.position - b.position)
    const blockedByDailyLimit = g.type !== "daily" && completedTodayByGroup.has(g.id)

    let foundActive = false
    const enriched: Mission[] = gMissions.map(m => {
      const done = completedSet.has(m.id)
      let status: Mission["status"]
      if (done) { status = "completed" }
      else if (!foundActive) { foundActive = true; status = "active" }
      else { status = "locked" }
      return {
        id: m.id, position: m.position, title: m.title, description: m.description,
        total: m.total, points_reward: m.points_reward, item_reward: m.item_reward as MissionReward,
        completed: done, completed_at: done ? (completedAtMap[m.id] ?? null) : null, status,
        unlocks_at: (status === "active" && blockedByDailyLimit) ? nextMidnightUtc.toISOString() : null,
        schedule: status === "active" ? (scheduleMap[m.id] ?? null) : null,
      }
    })

    return {
      id: g.id, title: g.title, description: g.description,
      type: g.type as Pass["type"], starts_at: g.starts_at, expires_at: g.expires_at,
      missions: enriched, total_completed: enriched.filter(m => m.completed).length,
    }
  }).filter(Boolean) as Pass[]

  return NextResponse.json({ passes })
}

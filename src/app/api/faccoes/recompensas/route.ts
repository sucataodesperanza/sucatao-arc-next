import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type MissionReward = { item_name: string; item_image: string; item_qty: number } | null

export type Mission = {
  id: string
  position: number
  title: string
  description: string
  total: number
  points_reward: number
  item_reward: MissionReward
  // estado do usuário
  completed: boolean
  completed_at: string | null
  // derivado
  status: "completed" | "active" | "locked"
  unlocks_at: string | null  // quando a missão ativa fica disponível (null = já disponível)
}

export type Pass = {
  id: string
  title: string
  description: string
  type: "daily" | "weekly" | "monthly"
  starts_at: string
  expires_at: string
  missions: Mission[]
  total_completed: number
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ passes: [] })

  // Facção do usuário
  const { data: uf } = await supabase
    .from("user_factions")
    .select("faction_id")
    .eq("user_id", user.id)
    .single()

  if (!uf?.faction_id) return NextResponse.json({ passes: [] })

  // Grupos ativos da facção
  const { data: groups } = await supabase
    .from("contract_groups")
    .select("id, title, description, type, starts_at, expires_at")
    .eq("faction_id", uf.faction_id)
    .eq("active", true)
    .lte("starts_at", new Date().toISOString())
    .gte("expires_at", new Date().toISOString())
    .order("type") // daily, monthly, weekly

  if (!groups?.length) return NextResponse.json({ passes: [] })

  const groupIds = groups.map(g => g.id)

  // Missões de todos os grupos
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

  // Verifica se o usuário já concluiu alguma missão hoje (BRT = UTC-3) por grupo
  const brtOffsetMs = 3 * 60 * 60 * 1000
  const nowBrt = new Date(Date.now() - brtOffsetMs)
  const todayStartBrt = new Date(nowBrt); todayStartBrt.setHours(0, 0, 0, 0)
  const todayStartUtc = new Date(todayStartBrt.getTime() + brtOffsetMs)
  const nextMidnightUtc = new Date(todayStartUtc.getTime() + 86400000)

  // Mapa groupId → completou alguma missão hoje (restrição diária)
  const completedTodayByGroup = new Set<string>()
  for (const c of (completions ?? []) as { mission_id: string; group_id: string; completed_at: string }[]) {
    const at = new Date(c.completed_at)
    if (at >= todayStartUtc && at < nextMidnightUtc) {
      completedTodayByGroup.add(c.group_id)
    }
  }

  // Monta passes
  const passes: Pass[] = groups.map(g => {
    const gMissions = (missions ?? [])
      .filter(m => m.group_id === g.id)
      .sort((a, b) => a.position - b.position)

    // Verifica se o usuário concluiu alguma missão deste grupo hoje
    const blockedByDailyLimit = g.type !== "daily" && completedTodayByGroup.has(g.id)

    let foundActive = false
    const enriched: Mission[] = gMissions.map(m => {
      const done = completedSet.has(m.id)
      let status: Mission["status"]
      if (done) {
        status = "completed"
      } else if (!foundActive) {
        foundActive = true
        status = "active"
      } else {
        status = "locked"
      }
      return {
        id:            m.id,
        position:      m.position,
        title:         m.title,
        description:   m.description,
        total:         m.total,
        points_reward: m.points_reward,
        item_reward:   m.item_reward as MissionReward,
        completed:     done,
        completed_at:  done ? (completedAtMap[m.id] ?? null) : null,
        status,
        // unlocks_at: se a missão é "active" mas o limite diário bloqueou, informa quando libera
        unlocks_at: (status === "active" && blockedByDailyLimit)
          ? nextMidnightUtc.toISOString()
          : null,
      }
    })

    return {
      id:              g.id,
      title:           g.title,
      description:     g.description,
      type:            g.type as Pass["type"],
      starts_at:       g.starts_at,
      expires_at:      g.expires_at,
      missions:        enriched,
      total_completed: enriched.filter(m => m.completed).length,
    }
  })

  return NextResponse.json({ passes })
}

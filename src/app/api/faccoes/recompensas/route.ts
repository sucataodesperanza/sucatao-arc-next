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
    .select("mission_id, completed_at")
    .eq("user_id", user.id)
    .in("group_id", groupIds)

  const completedSet = new Set((completions ?? []).map(c => c.mission_id))
  const completedAtMap = Object.fromEntries((completions ?? []).map(c => [c.mission_id, c.completed_at]))

  // Monta passes
  const passes: Pass[] = groups.map(g => {
    const gMissions = (missions ?? [])
      .filter(m => m.group_id === g.id)
      .sort((a, b) => a.position - b.position)

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

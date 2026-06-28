import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type ContractPass = {
  id: string
  title: string
  description: string
  type: "daily" | "weekly" | "monthly"
  starts_at: string
  expires_at: string
  price_points: number
  price_real: number
  faction_id: string | null
  image_url: string | null
  missions_count: number
  total_points: number   // soma de points_reward de todas as missões
  // estado do usuário
  purchased: boolean
  user_completed: number // missões concluídas pelo usuário
  purchase_id: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Passes gerais à venda: ainda não expirados (starts_at pode ser futuro — mostra na vitrine)
  const { data: groups } = await supabase
    .from("contract_groups")
    .select("id, title, description, type, starts_at, expires_at, price_points, price_real, faction_id, image_url")
    .is("faction_id", null)
    .eq("active", true)
    .gte("expires_at", new Date().toISOString())
    .order("starts_at", { ascending: true })

  if (!groups?.length) return NextResponse.json({ passes: [] })

  const groupIds = groups.map(g => g.id)

  // Conta missões e soma pontos por grupo
  const { data: missionData } = await supabase
    .from("contract_group_missions")
    .select("group_id, points_reward")
    .in("group_id", groupIds)

  const countMap: Record<string, number> = {}
  const pointsMap: Record<string, number> = {}
  for (const m of missionData ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
    pointsMap[m.group_id] = (pointsMap[m.group_id] ?? 0) + (m.points_reward ?? 0)
  }

  // Missões concluídas pelo usuário
  let completedMap: Record<string, number> = {}
  if (user) {
    const { data: comps } = await supabase
      .from("user_mission_completions")
      .select("group_id")
      .eq("user_id", user.id)
      .in("group_id", groupIds)
    for (const c of comps ?? []) {
      completedMap[c.group_id] = (completedMap[c.group_id] ?? 0) + 1
    }
  }

  // Compras do usuário
  let purchaseMap: Record<string, string> = {}
  if (user) {
    const { data: purchases } = await supabase
      .from("user_contract_group_purchases")
      .select("id, group_id")
      .eq("user_id", user.id)
      .in("group_id", groupIds)
    purchaseMap = Object.fromEntries((purchases ?? []).map(p => [p.group_id, p.id]))
  }

  const passes: ContractPass[] = groups.map(g => ({
    id:             g.id,
    title:          g.title,
    description:    g.description,
    type:           g.type as ContractPass["type"],
    starts_at:      g.starts_at,
    expires_at:     g.expires_at,
    price_points:   g.price_points,
    price_real:     g.price_real,
    faction_id:     g.faction_id,
    image_url:      g.image_url ?? null,
    missions_count: countMap[g.id] ?? 0,
    total_points:   pointsMap[g.id] ?? 0,
    purchased:      !!purchaseMap[g.id],
    user_completed: completedMap[g.id] ?? 0,
    purchase_id:    purchaseMap[g.id] ?? null,
  }))

  return NextResponse.json({ passes })
}

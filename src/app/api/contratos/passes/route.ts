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
  missions_count: number
  // estado do usuário
  purchased: boolean
  purchase_id: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Passes gerais ativos (faction_id IS NULL)
  const { data: groups } = await supabase
    .from("contract_groups")
    .select("id, title, description, type, starts_at, expires_at, price_points, price_real, faction_id")
    .is("faction_id", null)
    .eq("active", true)
    .lte("starts_at", new Date().toISOString())
    .gte("expires_at", new Date().toISOString())
    .order("type")

  if (!groups?.length) return NextResponse.json({ passes: [] })

  // Conta missões por grupo
  const groupIds = groups.map(g => g.id)
  const { data: missionCounts } = await supabase
    .from("contract_group_missions")
    .select("group_id")
    .in("group_id", groupIds)

  const countMap: Record<string, number> = {}
  for (const m of missionCounts ?? []) {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
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
    missions_count: countMap[g.id] ?? 0,
    purchased:      !!purchaseMap[g.id],
    purchase_id:    purchaseMap[g.id] ?? null,
  }))

  return NextResponse.json({ passes })
}

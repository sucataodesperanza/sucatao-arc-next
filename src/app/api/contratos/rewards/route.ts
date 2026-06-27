import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type PointReward = {
  id: string
  points_threshold: number
  item: {
    id: string
    name: string
    icon_url: string | null
    rarity: string | null
  }
  progress_pct: number   // 0–100, calculado com o saldo do usuário
  unlocked: boolean
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rewards } = await supabase
    .from("contract_point_rewards")
    .select("id, points_threshold, catalog_items(id, name, icon_url, rarity)")
    .eq("active", true)
    .order("points_threshold", { ascending: true })

  if (!rewards?.length) return NextResponse.json({ rewards: [] })

  let userPoints = 0
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single()
    userPoints = (profile as { points: number } | null)?.points ?? 0
  }

  const result: PointReward[] = rewards.map(r => {
    const item = r.catalog_items as unknown as { id: string; name: string; icon_url: string | null; rarity: string | null }
    const pct = Math.min(100, Math.round((userPoints / r.points_threshold) * 100))
    return {
      id:               r.id,
      points_threshold: r.points_threshold,
      item:             item ?? { id: "", name: "—", icon_url: null, rarity: null },
      progress_pct:     pct,
      unlocked:         userPoints >= r.points_threshold,
    }
  })

  return NextResponse.json({ rewards: result, user_points: userPoints })
}

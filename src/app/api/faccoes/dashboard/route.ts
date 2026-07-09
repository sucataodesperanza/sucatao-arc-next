import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type RepLevel = { name: string; min_points: number; color: string; position: number }

export type DashboardData = {
  faction: {
    id: string; slug: string; name: string; tagline: string
    description: string; color: string; icon_url: string | null
    bonuses: string[]; attributes: Record<string, number>
  } | null
  joined_at: string | null
  member_counts: { faction_id: string; count: number }[]
  faction_influence: number
  user_rank_in_faction: number | null
  faction_feed: {
    id: string; display_name: string; text: string
    points: number | null; event_type: string; created_at: string
  }[]
  my_activity: {
    id: string; text: string; points: number | null
    event_type: string; created_at: string
  }[]
  user_profile: {
    name: string | null; avatar_url: string | null; points: number | null; reputation: number | null
  } | null
  rep_levels: RepLevel[]
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const [ufRes, profileRes, countsRes, levelsRes] = await Promise.all([
    // Facção do usuário
    supabase
      .from("user_factions")
      .select("joined_at, factions(id, slug, name, tagline, description, color, icon_url, bonuses, attributes)")
      .eq("user_id", user.id)
      .single(),
    // Perfil
    supabase
      .from("profiles")
      .select("name, avatar_url, points, reputation")
      .eq("id", user.id)
      .single(),
    // Contagem de membros por facção
    supabase
      .from("user_factions")
      .select("faction_id"),
    // Níveis de reputação
    supabase
      .from("reputation_levels")
      .select("name, min_points, color, position")
      .order("position"),
  ])

  const factionData = (Array.isArray(ufRes.data?.factions) ? ufRes.data?.factions[0] : ufRes.data?.factions) as DashboardData["faction"] | null
  const factionId   = factionData?.id ?? null

  // Reputação de todos os membros da facção (para influência e rank)
  let factionInfluence     = 0
  let userRankInFaction: number | null = null

  if (factionId) {
    const { data: membersRep } = await supabase
      .from("user_factions")
      .select("user_id")
      .eq("faction_id", factionId)

    if (membersRep && membersRep.length > 0) {
      const userIds = membersRep.map(m => m.user_id)
      const { data: memberProfiles } = await supabase
        .from("profiles")
        .select("id, reputation")
        .in("id", userIds)

      if (memberProfiles && memberProfiles.length > 0) {
        const repList = memberProfiles.map(p => (p.reputation ?? 0) as number)
        factionInfluence = repList.reduce((a, b) => a + b, 0)

        const userRep = (profileRes.data?.reputation ?? 0) as number
        const sorted  = [...repList].sort((a, b) => b - a)
        userRankInFaction = sorted.findIndex(r => r <= userRep) + 1
      }
    }
  }

  const memberCounts: { faction_id: string; count: number }[] = []
  if (countsRes.data) {
    const map: Record<string, number> = {}
    for (const row of countsRes.data) {
      map[row.faction_id] = (map[row.faction_id] ?? 0) + 1
    }
    for (const [faction_id, count] of Object.entries(map)) {
      memberCounts.push({ faction_id, count })
    }
  }

  // Feed da facção (outros membros + o próprio)
  let factionFeed: DashboardData["faction_feed"] = []
  let myActivity:  DashboardData["my_activity"]  = []

  if (factionId) {
    const [feedRes, myRes] = await Promise.all([
      supabase
        .from("user_faction_activity")
        .select("id, display_name, text, points, event_type, created_at")
        .eq("faction_id", factionId)
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("user_faction_activity")
        .select("id, text, points, event_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ])
    factionFeed = feedRes.data ?? []
    myActivity  = myRes.data  ?? []
  }

  const result: DashboardData = {
    faction:              factionData ?? null,
    joined_at:            ufRes.data?.joined_at ?? null,
    member_counts:        memberCounts,
    faction_influence:    factionInfluence,
    user_rank_in_faction: userRankInFaction,
    faction_feed:         factionFeed,
    my_activity:          myActivity,
    user_profile:         profileRes.data ?? null,
    rep_levels:           (levelsRes.data ?? []) as RepLevel[],
  }

  return NextResponse.json(result)
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
  user_global_rank: number
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
  completed_contracts: number
}

export async function GET() {
  const supabase      = await createClient()
  const supabaseAdmin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const [ufRes, profileRes, countsRes, levelsRes, completedRes] = await Promise.all([
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
    supabaseAdmin
      .from("user_factions")
      .select("faction_id"),
    // Níveis de reputação
    supabase
      .from("reputation_levels")
      .select("name, min_points, color, position")
      .order("position"),
    // Contratos concluídos pelo usuário
    supabase
      .from("user_contracts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ])

  const factionData = (Array.isArray(ufRes.data?.factions) ? ufRes.data?.factions[0] : ufRes.data?.factions) as DashboardData["faction"] | null
  const factionId   = factionData?.id ?? null

  // Influência da facção (soma de reputação de todos os membros)
  let factionInfluence = 0

  if (factionId) {
    const { data: membersRep } = await supabaseAdmin
      .from("user_factions")
      .select("user_id")
      .eq("faction_id", factionId)

    if (membersRep && membersRep.length > 0) {
      const userIds = membersRep.map(m => m.user_id)
      const { data: memberProfiles } = await supabaseAdmin
        .from("profiles")
        .select("reputation")
        .in("id", userIds)

      if (memberProfiles && memberProfiles.length > 0) {
        factionInfluence = memberProfiles.reduce((a, p) => a + ((p.reputation ?? 0) as number), 0)
      }
    }
  }

  // Rank global: conta quantos usuários têm reputação maior que a do usuário
  const userRep = (profileRes.data?.reputation ?? 0) as number
  const { count: usersAbove } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .gt("reputation", userRep)
  const userGlobalRank = (usersAbove ?? 0) + 1

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
    user_global_rank:     userGlobalRank,
    faction_feed:         factionFeed,
    my_activity:          myActivity,
    user_profile:         profileRes.data ?? null,
    rep_levels:           (levelsRes.data ?? []) as RepLevel[],
    completed_contracts:  completedRes.count ?? 0,
  }

  return NextResponse.json(result)
}

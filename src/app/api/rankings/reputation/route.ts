import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getReputationLevel, getRepLevelsFromDB } from "@/lib/reputation"

export async function GET() {
  const supabase = createAdminClient()

  const [{ data }, levels] = await Promise.all([
    supabase.from("profiles").select("id, username, game_id, avatar_url, reputation, faction_id").order("reputation", { ascending: false }).limit(50),
    getRepLevelsFromDB(),
  ])

  const rows = (data ?? []).map((p: any, i: number) => ({
    rank:       i + 1,
    userId:     p.id,
    name:       p.username ?? p.game_id ?? "Anônimo",
    avatar_url: p.avatar_url ?? null,
    reputation: p.reputation ?? 0,
    level:      getReputationLevel(p.reputation ?? 0, levels),
  }))

  return NextResponse.json({ players: rows })
}

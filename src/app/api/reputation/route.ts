import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getReputationLevel, getNextLevel } from "@/lib/reputation"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const [profileRes, historyRes] = await Promise.all([
    supabase.from("profiles").select("reputation, reputation_streak, last_activity_date").eq("id", user.id).single(),
    supabase.from("reputation_history").select("id, amount, reason, source, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ])

  const reputation = (profileRes.data as { reputation: number } | null)?.reputation ?? 0
  const streak     = (profileRes.data as { reputation_streak: number } | null)?.reputation_streak ?? 0
  const level      = getReputationLevel(reputation)
  const next       = getNextLevel(reputation)

  return NextResponse.json({
    reputation,
    streak,
    level,
    next,
    history: historyRes.data ?? [],
  })
}

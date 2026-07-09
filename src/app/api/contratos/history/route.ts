import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type HistoryItem = {
  id: string
  status: "completed" | "failed" | "expired"
  progress: number
  accepted_at: string
  completed_at: string | null
  objectives_progress: Record<string, number>
  contracts: {
    id: string; title: string; sucatas: number; xp: number; rep: number | null
    mission_type: string; tier: string; image_url: string | null; total: number
    objectives: unknown[]
  } | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ history: [] })

  // Marca como expirados os contratos ativos cujo prazo já passou
  const now = new Date().toISOString()
  const { data: stillActive } = await supabase
    .from("user_contracts")
    .select("id, contracts!inner(expires_at)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .not("contracts.expires_at", "is", null)
    .lt("contracts.expires_at", now)

  if (stillActive && stillActive.length > 0) {
    await supabase.from("user_contracts")
      .update({ status: "expired" })
      .in("id", stillActive.map(r => r.id))
  }

  const { data } = await supabase
    .from("user_contracts")
    .select(`
      id, status, progress, accepted_at, completed_at, objectives_progress,
      contracts(id, title, sucatas, xp, rep, mission_type, tier, image_url, total, objectives)
    `)
    .eq("user_id", user.id)
    .in("status", ["completed", "failed", "expired"])
    .order("accepted_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ history: (data ?? []) as unknown as HistoryItem[] })
}

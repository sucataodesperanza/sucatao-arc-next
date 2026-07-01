import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export type TradeAcceptanceAdmin = {
  id: string
  status: string
  game_id: string | null
  created_at: string
  slot_id: string | null
  trade_slots: { label: string; scheduled_for: string } | null
  trades: { id: string; offer_points: number; want_item_name: string; want_item_qty: number } | null
  user_id: string
  profiles: { name: string | null; email: string | null } | null
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("trade_acceptances")
    .select(`
      id, status, game_id, created_at, scheduled_at, user_id, discord_channel_id,
      trades(id, offer_points, want_item_name, want_item_qty)
    `)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("api/admin/trades/acceptances error:", error)
    return NextResponse.json({ acceptances: [] })
  }

  // Busca perfis dos usuários separadamente (auth.users não é acessível via join)
  const userIds = [...new Set((data ?? []).map(a => a.user_id))]
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", userIds)

  const profileMap: Record<string, { name: string | null }> = {}
  for (const p of profilesData ?? []) profileMap[p.id] = { name: p.name }

  const acceptances = (data ?? []).map(a => ({
    ...a,
    profiles: profileMap[a.user_id] ?? null,
  }))

  return NextResponse.json({ acceptances })
}

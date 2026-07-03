import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/admin/expedicao/deposits — lista todos os agendamentos da expedição ativa
export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { data: expedition } = await admin
    .from("expeditions")
    .select("id, name")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1)
    .maybeSingle()

  if (!expedition) return NextResponse.json({ deposits: [], expedition: null })

  const { data } = await admin
    .from("expedition_vault_deposits")
    .select("id, user_id, type, items, slots_used, preferred_at, notes, status, admin_notes, created_at")
    .eq("expedition_id", expedition.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  // Busca nomes dos usuários
  const userIds = [...new Set((data ?? []).map(d => d.user_id))]
  const profileMap: Record<string, { name: string; game_id: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, game_id")
      .in("id", userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { name: p.display_name ?? "—", game_id: p.game_id ?? "—" }
    }
  }

  const enriched = (data ?? []).map(d => ({
    ...d,
    userName: profileMap[d.user_id]?.name ?? "—",
    gameId:   profileMap[d.user_id]?.game_id ?? "—",
  }))

  return NextResponse.json({ deposits: enriched, expedition })
}

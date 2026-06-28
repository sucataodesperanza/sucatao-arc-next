import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ missionId: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { missionId } = await params
  const body = await request.json().catch(() => ({}))
  const userId: string = body.user_id
  if (!userId) return NextResponse.json({ error: "user_id obrigatório." }, { status: 400 })

  const admin = createAdminClient()

  // Busca missão
  const { data: mission } = await admin
    .from("contract_group_missions")
    .select("id, group_id, points_reward, item_reward")
    .eq("id", missionId)
    .single()

  if (!mission) return NextResponse.json({ error: "Missão não encontrada." }, { status: 404 })

  // Verifica se já foi concluída
  const { data: existing } = await admin
    .from("user_mission_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .single()

  if (existing) return NextResponse.json({ error: "Missão já concluída para este usuário." }, { status: 409 })

  // Busca o grupo para verificar o tipo e a restrição diária
  const { data: group } = await admin
    .from("contract_groups")
    .select("type")
    .eq("id", mission.group_id)
    .single()

  // Passes com mais de 1 missão: máximo 1 conclusão por dia (calendário BRT = UTC-3)
  if (group && group.type !== "daily") {
    const brtOffsetMs = 3 * 60 * 60 * 1000
    const nowBrt = new Date(Date.now() - brtOffsetMs)
    const todayStartBrt = new Date(nowBrt)
    todayStartBrt.setHours(0, 0, 0, 0)
    const todayStartUtc = new Date(todayStartBrt.getTime() + brtOffsetMs)
    const todayEndUtc   = new Date(todayStartUtc.getTime() + 86400000)

    const { data: todayCompletion } = await admin
      .from("user_mission_completions")
      .select("id, completed_at")
      .eq("user_id", userId)
      .eq("group_id", mission.group_id)
      .gte("completed_at", todayStartUtc.toISOString())
      .lt("completed_at",  todayEndUtc.toISOString())
      .limit(1)
      .single()

    if (todayCompletion) {
      const unlocks_at = todayEndUtc.toISOString()
      return NextResponse.json({
        error: "Só é possível concluir 1 missão por dia neste passe.",
        code: "daily_limit",
        unlocks_at,
      }, { status: 429 })
    }
  }

  // Registra conclusão
  const { error } = await admin
    .from("user_mission_completions")
    .insert({
      user_id:         userId,
      group_id:        mission.group_id,
      mission_id:      missionId,
      points_credited: mission.points_reward,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Credita pontos em profiles
  if (mission.points_reward > 0) {
    const { data: profile } = await admin.from("profiles").select("points").eq("id", userId).single()
    const current = (profile as { points: number } | null)?.points ?? 0
    await admin.from("profiles").update({ points: current + mission.points_reward }).eq("id", userId)
  }

  return NextResponse.json({ ok: true, points_credited: mission.points_reward })
}

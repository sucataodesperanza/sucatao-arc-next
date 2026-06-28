import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Calcula o prazo de agendamento baseado no tipo do grupo
function expiresAtForType(type: string, activatedAt: Date): Date {
  const days = type === "daily" ? 1 : type === "weekly" ? 7 : 30
  return new Date(activatedAt.getTime() + days * 86400000)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: missionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { scheduled_at, game_id } = body

  if (!scheduled_at) return NextResponse.json({ error: "scheduled_at é obrigatório." }, { status: 400 })

  // Verifica se a missão existe e pertence a um grupo que o usuário comprou
  const { data: mission } = await supabase
    .from("contract_group_missions")
    .select("id, group_id, position, contract_groups(id, type, faction_id)")
    .eq("id", missionId)
    .single()

  if (!mission) return NextResponse.json({ error: "Missão não encontrada." }, { status: 404 })

  const group = mission.contract_groups as unknown as { id: string; type: string; faction_id: string | null } | null
  if (!group) return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 })

  // Verifica se o usuário comprou este contrato
  const { data: purchase } = await supabase
    .from("user_contract_group_purchases")
    .select("id, purchased_at")
    .eq("user_id", user.id)
    .eq("group_id", group.id)
    .single()

  if (!purchase) return NextResponse.json({ error: "Você não possui este contrato." }, { status: 403 })

  // Verifica se a missão está "ativa" para o usuário (anterior concluída)
  const { data: completions } = await supabase
    .from("user_mission_completions")
    .select("mission_id")
    .eq("user_id", user.id)
    .eq("group_id", group.id)

  const completedPositions = new Set<number>()
  if (completions?.length) {
    const { data: completedMissions } = await supabase
      .from("contract_group_missions")
      .select("id, position")
      .eq("group_id", group.id)
      .in("id", completions.map(c => c.mission_id))
    ;(completedMissions ?? []).forEach(m => completedPositions.add(m.position))
  }

  const activeMissionPosition = (Math.max(0, ...completedPositions) + 1) || 1
  if (mission.position !== activeMissionPosition) {
    return NextResponse.json({ error: "Esta missão ainda não está disponível para agendamento." }, { status: 409 })
  }

  // Verifica conflito de horário (reutiliza sistema do trades)
  const { data: conflict } = await supabase
    .from("contract_mission_schedules")
    .select("id")
    .eq("scheduled_at", scheduled_at)
    .neq("status", "cancelled")
    .neq("status", "expired")
    .single()

  if (conflict) return NextResponse.json({ error: "Este horário já está ocupado. Escolha outro." }, { status: 409 })

  // Calcula prazo baseado em quando a missão ficou ativa
  const activatedAt = completedPositions.size > 0
    ? new Date() // simplificado: usa agora (missão acabou de ser desbloqueada)
    : new Date(purchase.purchased_at)
  const expiresAt = expiresAtForType(group.type, activatedAt)

  const admin = createAdminClient()

  // Cria ou atualiza o agendamento
  const { error } = await admin
    .from("contract_mission_schedules")
    .upsert({
      user_id:      user.id,
      group_id:     group.id,
      mission_id:   missionId,
      scheduled_at,
      game_id:      game_id || null,
      status:       "scheduled",
      expires_at:   expiresAt.toISOString(),
    }, { onConflict: "user_id,mission_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Retorna o agendamento atual do usuário para uma missão
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: missionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ schedule: null })

  const { data } = await supabase
    .from("contract_mission_schedules")
    .select("id, scheduled_at, game_id, status, expires_at")
    .eq("user_id", user.id)
    .eq("mission_id", missionId)
    .single()

  return NextResponse.json({ schedule: data ?? null })
}

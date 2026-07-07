import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { addItemsToInventory } from "@/lib/inventory"
import { sendDiscordDM, dmRecompensaCreditada } from "@/lib/discord-bot"
import { addReputation, getRepPoints } from "@/lib/reputation"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id: scheduleId } = await params
  const admin = createAdminClient()

  // ── Tenta o sistema unificado (contract_schedules) primeiro ──
  const { data: cs } = await admin
    .from("contract_schedules")
    .select("id, user_id, contract_id, objective_index, status")
    .eq("id", scheduleId)
    .maybeSingle()

  if (cs) {
    if (cs.status === "confirmed") return NextResponse.json({ error: "Já confirmado." }, { status: 409 })

    // Busca contrato e progresso do usuário
    const [contractRes, ucRes, profileRes] = await Promise.all([
      admin.from("contracts").select("id, sucatas, xp, rep, objectives").eq("id", cs.contract_id).single(),
      admin.from("user_contracts").select("id, objectives_progress, status").eq("user_id", cs.user_id).eq("contract_id", cs.contract_id).single(),
      admin.from("profiles").select("points, username, discord_id").eq("id", cs.user_id).single(),
    ])

    if (!contractRes.data || !ucRes.data) {
      return NextResponse.json({ error: "Contrato ou progresso não encontrado." }, { status: 404 })
    }

    const contract     = contractRes.data
    const uc           = ucRes.data
    const profile      = profileRes.data as { points: number; username: string | null; discord_id: string | null } | null
    const objectives   = (contract.objectives as any[]) ?? []
    const objIdx       = cs.objective_index
    const obj          = objectives[objIdx]

    if (!obj) return NextResponse.json({ error: "Objetivo inválido." }, { status: 400 })

    // Atualiza objectives_progress: marca o objetivo como concluído
    const currentProg = (uc.objectives_progress as Record<string, number>) ?? {}
    const updatedProg = { ...currentProg, [String(objIdx)]: obj.total }

    // Verifica se TODOS os objetivos estão concluídos
    const allDone = objectives.every((o, i) => (updatedProg[String(i)] ?? 0) >= o.total)

    // Atualiza user_contracts
    await admin
      .from("user_contracts")
      .update({
        objectives_progress: updatedProg,
        progress:            Object.values(updatedProg).reduce((a, b) => a + b, 0),
        ...(allDone ? { status: "completed", completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", uc.id)

    // Se concluiu tudo: credita recompensas
    let sucatasCredited = 0
    if (allDone) {
      const currentPoints = profile?.points ?? 0
      sucatasCredited = contract.sucatas ?? 0
      if (sucatasCredited > 0) {
        await admin.from("profiles").update({ points: currentPoints + sucatasCredited }).eq("id", cs.user_id)
      }

      getRepPoints("contract")
        .then(pts => addReputation(cs.user_id, pts, "contract", "Contrato concluído", scheduleId))
        .catch(() => {})

      if (sucatasCredited > 0) {
        sendDiscordDM(
          profile?.discord_id,
          dmRecompensaCreditada(profile?.username ?? "Jogador", contract.objectives?.[0] ?? "Contrato", {
            points: sucatasCredited,
            itemName: null,
          }),
        ).catch(() => {})
      }
    }

    // Marca agendamento como confirmado
    await admin.from("contract_schedules").update({ status: "confirmed" }).eq("id", scheduleId)

    return NextResponse.json({
      ok: true,
      sucatas_credited: sucatasCredited,
      all_done: allDone,
    })
  }

  // ── Sistema antigo (contract_mission_schedules) ──
  const { data: schedule } = await admin
    .from("contract_mission_schedules")
    .select("id, user_id, mission_id, group_id, status")
    .eq("id", scheduleId)
    .single()

  if (!schedule) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 })
  if (schedule.status === "confirmed") return NextResponse.json({ error: "Já confirmado." }, { status: 409 })

  const { data: mission } = await admin
    .from("contract_group_missions")
    .select("id, position, points_reward, item_reward")
    .eq("id", schedule.mission_id)
    .single()

  if (!mission) return NextResponse.json({ error: "Missão não encontrada." }, { status: 404 })

  const { data: existingCompletion } = await admin
    .from("user_mission_completions")
    .select("id")
    .eq("user_id", schedule.user_id)
    .eq("mission_id", schedule.mission_id)
    .maybeSingle()

  if (!existingCompletion) {
    await admin.from("user_mission_completions").insert({
      user_id:         schedule.user_id,
      group_id:        schedule.group_id,
      mission_id:      schedule.mission_id,
      points_credited: mission.points_reward ?? 0,
    })
  }

  const { data: profile } = await admin.from("profiles").select("points, username, discord_id").eq("id", schedule.user_id).single()
  const profileData = profile as { points: number; username: string | null; discord_id: string | null } | null

  if ((mission.points_reward ?? 0) > 0) {
    const current = profileData?.points ?? 0
    await admin.from("profiles").update({ points: current + (mission.points_reward ?? 0) }).eq("id", schedule.user_id)
  }

  const itemReward = mission.item_reward as { item_name: string; item_image: string | null; item_rarity: string | null; item_qty: number } | null
  if (itemReward) {
    const { data: catalogItem } = await admin
      .from("catalog_items")
      .select("id")
      .ilike("name", itemReward.item_name)
      .single()

    if (catalogItem) {
      await addItemsToInventory(
        schedule.user_id,
        [{ itemId: catalogItem.id, quantity: itemReward.item_qty ?? 1 }],
        "admin"
      )
    }
  }

  await admin.from("contract_mission_schedules").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", scheduleId)

  getRepPoints("contract").then(pts => addReputation(schedule.user_id, pts, "contract", "Missão de contrato concluída", scheduleId)).catch(() => {})

  if ((mission.points_reward ?? 0) > 0 || itemReward) {
    sendDiscordDM(
      profileData?.discord_id,
      dmRecompensaCreditada(profileData?.username ?? "Jogador", "Sua missão", {
        points: mission.points_reward ?? 0,
        itemName: itemReward?.item_name ?? null,
      }),
    ).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    points_credited: mission.points_reward ?? 0,
    item_credited: itemReward ? itemReward.item_name : null,
  })
}

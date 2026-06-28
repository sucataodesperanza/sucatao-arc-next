import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { addItemsToInventory } from "@/lib/inventory"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id: scheduleId } = await params
  const admin = createAdminClient()

  // Busca o agendamento
  const { data: schedule } = await admin
    .from("contract_mission_schedules")
    .select("id, user_id, mission_id, group_id, status")
    .eq("id", scheduleId)
    .single()

  if (!schedule) return NextResponse.json({ error: "Agendamento não encontrado." }, { status: 404 })
  if (schedule.status === "confirmed") return NextResponse.json({ error: "Já confirmado." }, { status: 409 })

  // Busca missão com recompensa
  const { data: mission } = await admin
    .from("contract_group_missions")
    .select("id, position, points_reward, item_reward")
    .eq("id", schedule.mission_id)
    .single()

  if (!mission) return NextResponse.json({ error: "Missão não encontrada." }, { status: 404 })

  // Verifica se já foi concluída
  const { data: existingCompletion } = await admin
    .from("user_mission_completions")
    .select("id")
    .eq("user_id", schedule.user_id)
    .eq("mission_id", schedule.mission_id)
    .single()

  if (!existingCompletion) {
    // Registra conclusão
    await admin.from("user_mission_completions").insert({
      user_id:         schedule.user_id,
      group_id:        schedule.group_id,
      mission_id:      schedule.mission_id,
      points_credited: mission.points_reward ?? 0,
    })
  }

  // Credita pontos
  if ((mission.points_reward ?? 0) > 0) {
    const { data: profile } = await admin.from("profiles").select("points").eq("id", schedule.user_id).single()
    const current = (profile as { points: number } | null)?.points ?? 0
    await admin.from("profiles").update({ points: current + (mission.points_reward ?? 0) }).eq("id", schedule.user_id)
  }

  // Credita item no inventário
  const itemReward = mission.item_reward as { item_name: string; item_image: string | null; item_rarity: string | null; item_qty: number } | null
  if (itemReward) {
    // Tenta encontrar o item no catálogo pelo nome para obter o id real
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

  // Marca agendamento como confirmado
  await admin
    .from("contract_mission_schedules")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", scheduleId)

  return NextResponse.json({
    ok: true,
    points_credited: mission.points_reward ?? 0,
    item_credited: itemReward ? itemReward.item_name : null,
  })
}

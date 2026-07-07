import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logEconomy } from "@/lib/economy"

type Objective = { text: string; desc: string; total: number; item_id?: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { objective_index, quantity } = body as { objective_index?: number; quantity?: number }

  if (typeof objective_index !== "number" || objective_index < 0)
    return NextResponse.json({ error: "objective_index inválido." }, { status: 400 })
  if (typeof quantity !== "number" || quantity < 1)
    return NextResponse.json({ error: "quantity deve ser >= 1." }, { status: 400 })

  // Busca user_contract ativo
  const { data: uc } = await supabase
    .from("user_contracts")
    .select("id, status, objectives_progress")
    .eq("contract_id", id)
    .eq("user_id", user.id)
    .single()

  if (!uc) return NextResponse.json({ error: "Contrato não aceito." }, { status: 404 })
  if (uc.status !== "active") return NextResponse.json({ error: "Contrato não está ativo." }, { status: 409 })

  // Busca contrato com objetivos
  const { data: contract } = await supabase
    .from("contracts")
    .select("objectives, sucatas, xp, rep, title, total")
    .eq("id", id)
    .eq("active", true)
    .single()

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 })

  const objectives = (contract.objectives ?? []) as Objective[]

  if (objective_index >= objectives.length)
    return NextResponse.json({ error: "Objetivo não existe." }, { status: 400 })

  const objective = objectives[objective_index]
  if (!objective.item_id)
    return NextResponse.json({ error: "Este objetivo não requer entrega de item." }, { status: 400 })

  const progress = (uc.objectives_progress ?? {}) as Record<string, number>
  const delivered = progress[String(objective_index)] ?? 0
  const remaining = objective.total - delivered

  if (remaining <= 0)
    return NextResponse.json({ error: "Objetivo já completo." }, { status: 409 })

  const toDeliver = Math.min(quantity, remaining)

  // Verifica inventário
  const { data: invEntry } = await supabase
    .from("user_inventory")
    .select("quantity")
    .eq("user_id", user.id)
    .eq("item_id", objective.item_id)
    .single()

  if (!invEntry || invEntry.quantity < toDeliver)
    return NextResponse.json({ error: "Itens insuficientes no inventário." }, { status: 400 })

  const admin = createAdminClient()

  // Deduz do inventário
  const newInvQty = invEntry.quantity - toDeliver
  if (newInvQty === 0) {
    await admin.from("user_inventory").delete().eq("user_id", user.id).eq("item_id", objective.item_id)
  } else {
    await admin.from("user_inventory").update({ quantity: newInvQty }).eq("user_id", user.id).eq("item_id", objective.item_id)
  }

  // Atualiza objectives_progress
  const newProgress = { ...progress, [String(objective_index)]: delivered + toDeliver }

  // Verifica se todos os objetivos com item_id estão completos
  const allComplete = objectives.every((obj, i) => {
    if (!obj.item_id) return true
    return (newProgress[String(i)] ?? 0) >= obj.total
  })

  if (allComplete) {
    await admin.from("user_contracts").update({
      objectives_progress: newProgress,
      status: "completed",
      completed_at: new Date().toISOString(),
      progress: contract.total ?? objectives.length,
    }).eq("id", uc.id)

    const { data: profile } = await admin
      .from("profiles")
      .select("points, reputation, discord_id, username")
      .eq("id", user.id)
      .single()

    const currentPts = (profile as { points: number } | null)?.points ?? 0
    const currentRep = (profile as { reputation: number } | null)?.reputation ?? 0
    const sucatas = contract.sucatas ?? 0
    const rep = contract.rep ?? 0

    const updates: Record<string, number> = {}
    if (sucatas > 0) updates.points = currentPts + sucatas
    if (rep > 0) updates.reputation = currentRep + rep

    if (Object.keys(updates).length > 0) {
      await admin.from("profiles").update(updates).eq("id", user.id)
    }

    if (sucatas > 0) {
      await logEconomy({
        player_id: user.id, action: "reward", value: sucatas,
        currency: "points", source: "contract", source_id: uc.id,
      })
    }

    return NextResponse.json({ ok: true, delivered: toDeliver, completed: true, rewards: { sucatas, rep } })
  }

  await admin.from("user_contracts").update({
    objectives_progress: newProgress,
    progress: Object.values(newProgress).reduce((s, v) => s + v, 0),
  }).eq("id", uc.id)

  return NextResponse.json({ ok: true, delivered: toDeliver, completed: false })
}

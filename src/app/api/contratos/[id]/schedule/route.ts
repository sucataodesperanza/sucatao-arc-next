import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contractId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { objective_index, scheduled_at, game_id } = body

  if (objective_index === undefined || objective_index === null) {
    return NextResponse.json({ error: "objective_index é obrigatório." }, { status: 400 })
  }

  // Verifica se o usuário tem este contrato ativo
  const { data: uc } = await supabase
    .from("user_contracts")
    .select("id, status, objectives_progress")
    .eq("user_id", user.id)
    .eq("contract_id", contractId)
    .single()

  if (!uc || uc.status !== "active") {
    return NextResponse.json({ error: "Contrato não encontrado ou não está ativo." }, { status: 404 })
  }

  // Verifica se o objetivo solicitado é o objetivo ativo (anterior já concluído)
  const { data: contract } = await supabase
    .from("contracts")
    .select("objectives")
    .eq("id", contractId)
    .single()

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 })

  const objectives = (contract.objectives as any[]) ?? []
  const objProg = (uc.objectives_progress as Record<string, number>) ?? {}

  // Verifica que todos os objetivos ANTES do solicitado estão concluídos
  for (let i = 0; i < objective_index; i++) {
    const obj = objectives[i]
    if (!obj) continue
    const done = (objProg[String(i)] ?? 0) >= obj.total
    if (!done) {
      return NextResponse.json({ error: "Objetivo anterior ainda não concluído." }, { status: 409 })
    }
  }

  // Verifica conflito de horário (se scheduled_at fornecido)
  if (scheduled_at) {
    const { data: conflict } = await supabase
      .from("contract_schedules")
      .select("id")
      .eq("scheduled_at", scheduled_at)
      .neq("status", "cancelled")
      .maybeSingle()

    // Também verifica na tabela antiga
    const { data: oldConflict } = await supabase
      .from("contract_mission_schedules")
      .select("id")
      .eq("scheduled_at", scheduled_at)
      .neq("status", "cancelled")
      .neq("status", "expired")
      .maybeSingle()

    if (conflict || oldConflict) {
      return NextResponse.json({ error: "Este horário já está ocupado. Escolha outro." }, { status: 409 })
    }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from("contract_schedules")
    .upsert({
      user_id:         user.id,
      contract_id:     contractId,
      objective_index: Number(objective_index),
      scheduled_at:    scheduled_at || null,
      game_id:         game_id || null,
      status:          "scheduled",
    }, { onConflict: "user_id,contract_id,objective_index" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: contractId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ schedules: [] })

  const { data } = await supabase
    .from("contract_schedules")
    .select("id, objective_index, scheduled_at, game_id, status")
    .eq("user_id", user.id)
    .eq("contract_id", contractId)
    .neq("status", "cancelled")

  return NextResponse.json({ schedules: data ?? [] })
}

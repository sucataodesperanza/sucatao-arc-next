import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type ContractReward =
  | { kind: "currency"; amount: number }
  | { kind: "xp"; amount: number }
  | { kind: "item"; amount?: number; item_name: string; item_image: string; item_qty: number }

export type ContractObjective = {
  text: string; desc: string; total: number
  item_id?: string; item_name?: string; item_icon?: string
}
export type ContractEnemy = { name: string; type: string; dots: number; color: string; image: string }

export type Contract = {
  id: string
  type: string
  tier: string
  contract_type: "comum" | "faccao"
  mission_type: "diario" | "semanal" | "mensal"
  price_points: number
  price_real: number
  title: string
  description: string
  story: string
  image_url: string | null
  objective: string
  total: number
  sucatas: number
  xp: number
  rep: number | null
  location: string
  estimated_time: string
  best_time_of_day: string
  climate: string
  environmental_risk: string
  expires_at: string | null
  variant: string | null
  faction_id: string | null
  rewards: ContractReward[]
  objectives: ContractObjective[]
  enemies: ContractEnemy[]
  success_rate: number
  players_completed: number
  best_record_time: string
  best_record_player: string
  // progresso do usuário (null se não aceitou)
  user_progress: number | null
  user_status: string | null
  user_contract_id: string | null
  objectives_progress: Record<string, number>
  // agendamento ativo (null se não há)
  active_schedule: { id: string; scheduled_at: string | null; game_id: string | null; status: string } | null
  // cor da facção do usuário (preenchida só para contratos de facção)
  faction_color: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contracts, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ contracts: [] })

  // Fação do usuário (para filtrar contratos de facção)
  let userFactionId:    string | null = null
  let userFactionColor: string | null = null
  let userContracts: { contract_id: string; progress: number; status: string; id: string; objectives_progress: Record<string, number> }[] = []
  let scheduleMap: Record<string, { id: string; scheduled_at: string | null; game_id: string | null; status: string; objective_index: number }[]> = {}

  if (user) {
    const [ufRes, ucRes, schedRes] = await Promise.all([
      supabase.from("user_factions").select("faction_id, factions(color)").eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("user_contracts").select("id, contract_id, progress, status, objectives_progress").eq("user_id", user.id),
      supabase.from("contract_schedules").select("id, contract_id, objective_index, scheduled_at, game_id, status").eq("user_id", user.id).neq("status", "cancelled"),
    ])

    userFactionId    = ufRes.data?.faction_id ?? null
    userFactionColor = (ufRes.data as any)?.factions?.color ?? null
    userContracts    = ucRes.data ?? []

    for (const s of (schedRes.data ?? [])) {
      if (!scheduleMap[s.contract_id]) scheduleMap[s.contract_id] = []
      scheduleMap[s.contract_id].push(s)
    }

    // Marca como expirados os contratos ativos cujo prazo já passou
    const now = new Date().toISOString()
    const expiredIds = userContracts
      .filter(uc => uc.status === "active")
      .filter(uc => {
        const c = (contracts ?? []).find(c => c.id === uc.contract_id)
        return c?.expires_at && c.expires_at < now
      })
      .map(uc => uc.id)

    if (expiredIds.length > 0) {
      await supabase.from("user_contracts").update({ status: "expired" }).in("id", expiredIds)
      for (const uc of userContracts) {
        if (expiredIds.includes(uc.id)) uc.status = "expired"
      }
    }
  }

  const ucMap = Object.fromEntries(userContracts.map(uc => [uc.contract_id, uc]))

  const result: Contract[] = (contracts ?? [])
    .filter(c => {
      if (c.contract_type !== "faccao") return true
      return c.faction_id === userFactionId
    })
    .map(c => {
      const uc = ucMap[c.id]

      // Determina o índice do objetivo ativo (primeiro não concluído)
      const objectives = (c.objectives as ContractObjective[]) ?? []
      const objProg = (uc?.objectives_progress as Record<string, number>) ?? {}
      let activeObjIdx = objectives.findIndex((o, i) => (objProg[String(i)] ?? 0) < o.total)
      if (activeObjIdx === -1 && objectives.length > 0) activeObjIdx = objectives.length - 1

      // Agendamento ativo para o objetivo atual
      const contractSchedules = scheduleMap[c.id] ?? []
      const activeSchedule = contractSchedules.find(s => s.objective_index === activeObjIdx && s.status === "scheduled") ?? null

      return {
        ...c,
        user_progress:       uc?.progress             ?? null,
        user_status:         uc?.status               ?? null,
        user_contract_id:    uc?.id                   ?? null,
        objectives_progress: objProg,
        active_schedule:     activeSchedule
          ? { id: activeSchedule.id, scheduled_at: activeSchedule.scheduled_at, game_id: activeSchedule.game_id, status: activeSchedule.status }
          : null,
        faction_color: c.contract_type === "faccao" ? (userFactionColor ?? null) : null,
      }
    })

  return NextResponse.json({ contracts: result })
}

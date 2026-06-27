import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type ContractReward =
  | { kind: "currency"; amount: number }
  | { kind: "xp"; amount: number }
  | { kind: "item"; amount?: number; item_name: string; item_image: string; item_qty: number }

export type ContractObjective = { text: string; desc: string; total: number }
export type ContractEnemy = { name: string; type: string; dots: number; color: string; image: string }

export type Contract = {
  id: string
  type: string
  tier: string
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
  bonus_condition: string
  bonus_reward: string
  rewards: ContractReward[]
  objectives: ContractObjective[]
  enemies: ContractEnemy[]
  success_rate: number
  players_completed: number
  best_record_time: string
  best_record_player: string
  faction_id: string | null
  // progresso do usuário (null se não aceitou)
  user_progress: number | null
  user_status: string | null
  user_contract_id: string | null
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

  // Busca aceitações do usuário
  let userContracts: { contract_id: string; progress: number; status: string; id: string }[] = []
  if (user) {
    const { data } = await supabase
      .from("user_contracts")
      .select("id, contract_id, progress, status")
      .eq("user_id", user.id)
    userContracts = data ?? []
  }

  const ucMap = Object.fromEntries(userContracts.map(uc => [uc.contract_id, uc]))

  const result: Contract[] = (contracts ?? []).map(c => {
    const uc = ucMap[c.id]
    return {
      ...c,
      user_progress:    uc?.progress    ?? null,
      user_status:      uc?.status      ?? null,
      user_contract_id: uc?.id          ?? null,
    }
  })

  return NextResponse.json({ contracts: result })
}

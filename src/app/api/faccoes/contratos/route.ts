import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Contract } from "@/app/api/contratos/route"

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ contracts: [] })

  // Busca facção do usuário
  const { data: uf } = await supabase
    .from("user_factions")
    .select("faction_id")
    .eq("user_id", user.id)
    .single()

  if (!uf?.faction_id) return NextResponse.json({ contracts: [] })

  // Contratos ativos da facção do usuário
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("active", true)
    .eq("faction_id", uf.faction_id)
    .order("created_at", { ascending: false })

  if (!contracts?.length) return NextResponse.json({ contracts: [] })

  // Progresso do usuário
  const { data: userContracts } = await supabase
    .from("user_contracts")
    .select("id, contract_id, progress, status")
    .eq("user_id", user.id)
    .in("contract_id", contracts.map(c => c.id))

  const ucMap = Object.fromEntries((userContracts ?? []).map(uc => [uc.contract_id, uc]))

  const result: Contract[] = contracts.map(c => {
    const uc = ucMap[c.id]
    return {
      ...c,
      user_progress:    uc?.progress ?? null,
      user_status:      uc?.status   ?? null,
      user_contract_id: uc?.id       ?? null,
    }
  })

  return NextResponse.json({ contracts: result })
}

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

  const now = new Date().toISOString()

  // Contratos ativos da facção — exclui os com expires_at já expirado
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("active", true)
    .eq("faction_id", uf.faction_id)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })

  if (!contracts?.length) return NextResponse.json({ contracts: [] })

  // Progresso do usuário
  const { data: userContracts } = await supabase
    .from("user_contracts")
    .select("id, contract_id, progress, status, objectives_progress")
    .eq("user_id", user.id)
    .in("contract_id", contracts.map(c => c.id))

  const ucMap = Object.fromEntries((userContracts ?? []).map(uc => [uc.contract_id, uc]))

  // Marca como expirados contratos que o usuário tinha ativo mas o prazo passou
  const expiredIds = (userContracts ?? [])
    .filter(uc => uc.status === "active")
    .filter(uc => {
      const c = contracts.find(c => c.id === uc.contract_id)
      return c?.expires_at && c.expires_at < now
    })
    .map(uc => uc.id)

  if (expiredIds.length > 0) {
    await supabase.from("user_contracts").update({ status: "expired" }).in("id", expiredIds)
    for (const uc of (userContracts ?? [])) {
      if (expiredIds.includes(uc.id)) uc.status = "expired"
    }
  }

  const result: Contract[] = contracts
    .filter(c => {
      const uc = ucMap[c.id]
      return uc?.status !== "expired"
    })
    .map(c => {
      const uc = ucMap[c.id]
      return {
        ...c,
        user_progress:       uc?.progress             ?? null,
        user_status:         uc?.status               ?? null,
        user_contract_id:    uc?.id                   ?? null,
        objectives_progress: (uc?.objectives_progress as Record<string, number>) ?? {},
        active_schedule:     null,
        faction_color:       null,
      }
    })

  return NextResponse.json({ contracts: result })
}

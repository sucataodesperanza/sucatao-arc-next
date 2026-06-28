import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logEconomy } from "@/lib/economy"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()

  // Busca aceitação com dados do contrato
  const { data: acceptance } = await admin
    .from("user_contracts")
    .select("id, user_id, status, contracts(sucatas, total)")
    .eq("id", id)
    .single()

  if (!acceptance) return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 })
  if (acceptance.status === "completed") return NextResponse.json({ error: "Já concluído." }, { status: 409 })

  const contract = Array.isArray(acceptance.contracts) ? acceptance.contracts[0] : acceptance.contracts
  const sucatas = (contract as { sucatas: number })?.sucatas ?? 0

  // Marca como concluído
  await admin
    .from("user_contracts")
    .update({ status: "completed", progress: (contract as { total: number })?.total ?? 1, completed_at: new Date().toISOString() })
    .eq("id", id)

  // Credita sucatas em profiles.points
  if (sucatas > 0) {
    const { data: profile } = await admin.from("profiles").select("points").eq("id", acceptance.user_id).single()
    const current = (profile as { points: number } | null)?.points ?? 0
    await admin.from("profiles").update({ points: current + sucatas }).eq("id", acceptance.user_id)
  }

  if (sucatas > 0) {
    await logEconomy({ player_id: acceptance.user_id as string, action: "reward", value: sucatas, currency: "points", source: "contract", source_id: id })
  }

  return NextResponse.json({ ok: true, sucatas_credited: sucatas })
}

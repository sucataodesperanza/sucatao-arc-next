import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { deliverRewards } from "@/lib/referral-rewards"

export type ReferralSummary = {
  code: string
  total: number
  pending: number
  confirmed: number
  reward_delivered: number
  referrals: {
    id: string
    referred_name: string | null
    referred_avatar: string | null
    status: string
    registered_at: string | null
    confirmed_at: string | null
    reward_delivered_at: string | null
    created_at: string
  }[]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const admin = createAdminClient()

  // Código do usuário
  const { data: codeRow } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .single()

  // Indicações feitas por este usuário
  const { data: referrals } = await admin
    .from("referrals")
    .select("id, referred_id, status, registered_at, contract_accepted_at, contract_completed_at, confirmed_at, reward_delivered_at, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false })

  if (!referrals?.length) {
    return NextResponse.json({
      code: codeRow?.code ?? null,
      total: 0, pending: 0, confirmed: 0, reward_delivered: 0,
      referrals: [],
    } satisfies ReferralSummary)
  }

  // Atualização lazy de status: verifica requisitos dos indicados
  const toUpdate: { id: string; status: string; contract_accepted_at?: string; contract_completed_at?: string; confirmed_at?: string }[] = []

  const referredIds = referrals.map(r => r.referred_id).filter(Boolean) as string[]
  const [{ data: uc_accepted }, { data: uc_completed }] = await Promise.all([
    admin.from("user_contracts").select("user_id").in("user_id", referredIds).in("status", ["active", "completed"]),
    admin.from("user_contracts").select("user_id").in("user_id", referredIds).eq("status", "completed"),
  ])

  const acceptedSet  = new Set((uc_accepted ?? []).map(r => r.user_id))
  const completedSet = new Set((uc_completed ?? []).map(r => r.user_id))

  for (const r of referrals) {
    if (!r.referred_id) continue
    if (r.status === "cancelled" || r.status === "reward_delivered") continue

    let newStatus = r.status
    const upd: typeof toUpdate[0] = { id: r.id, status: r.status }

    if (completedSet.has(r.referred_id) && r.status !== "confirmed") {
      newStatus = "confirmed"
      upd.status = "confirmed"
      if (!r.contract_accepted_at) upd.contract_accepted_at = new Date().toISOString()
      if (!r.contract_completed_at) upd.contract_completed_at = new Date().toISOString()
      if (!r.confirmed_at) upd.confirmed_at = new Date().toISOString()
      r.confirmed_at = upd.confirmed_at!
      r.status = "confirmed"
    } else if (acceptedSet.has(r.referred_id) && r.status === "registered") {
      newStatus = "pending_requirements"
      upd.status = "pending_requirements"
      if (!r.contract_accepted_at) upd.contract_accepted_at = new Date().toISOString()
      r.status = "pending_requirements"
    }

    if (newStatus !== (r as any)._originalStatus) toUpdate.push(upd)
  }

  if (toUpdate.length > 0) {
    await Promise.all(toUpdate.map(async u => {
      await admin.from("referrals").update({ status: u.status, contract_accepted_at: u.contract_accepted_at, contract_completed_at: u.contract_completed_at, confirmed_at: u.confirmed_at }).eq("id", u.id)
      await deliverRewards(u.id, u.status, admin)
    }))
  }

  // Busca perfis dos indicados
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, avatar_url")
    .in("id", referredIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const result: ReferralSummary = {
    code: codeRow?.code ?? null,
    total: referrals.length,
    pending: referrals.filter(r => r.status === "registered" || r.status === "pending_requirements").length,
    confirmed: referrals.filter(r => r.status === "confirmed").length,
    reward_delivered: referrals.filter(r => r.status === "reward_delivered").length,
    referrals: referrals.map(r => ({
      id: r.id,
      referred_name:         profileMap[r.referred_id ?? ""]?.name ?? null,
      referred_avatar:       profileMap[r.referred_id ?? ""]?.avatar_url ?? null,
      status:                r.status,
      registered_at:         r.registered_at,
      confirmed_at:          r.confirmed_at,
      reward_delivered_at:   r.reward_delivered_at,
      created_at:            r.created_at,
    })),
  }

  return NextResponse.json(result)
}

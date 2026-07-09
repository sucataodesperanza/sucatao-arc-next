import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  return data?.is_admin ? supabase : null
}

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })

  const admin = createAdminClient()

  const { data: referrals } = await admin
    .from("referrals")
    .select("id, referrer_id, referred_id, code_used, status, registered_at, confirmed_at, reward_delivered_at, cancelled_at, created_at, origin")
    .order("created_at", { ascending: false })
    .limit(200)

  if (!referrals?.length) return NextResponse.json({ referrals: [] })

  // Perfis dos referrers e indicados
  const allIds = [...new Set([
    ...referrals.map(r => r.referrer_id),
    ...referrals.map(r => r.referred_id).filter(Boolean),
  ])] as string[]

  const { data: profiles } = await admin.from("profiles").select("id, name, avatar_url").in("id", allIds)
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const result = referrals.map(r => ({
    ...r,
    referrer_name:   profileMap[r.referrer_id]?.name ?? null,
    referred_name:   r.referred_id ? (profileMap[r.referred_id]?.name ?? null) : null,
  }))

  return NextResponse.json({ referrals: result })
}

export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { id, status } = body
  if (!id || !status) return NextResponse.json({ error: "id e status são obrigatórios." }, { status: 400 })

  const admin = createAdminClient()
  const updates: Record<string, string | null> = { status }
  if (status === "reward_delivered") updates.reward_delivered_at = new Date().toISOString()
  if (status === "cancelled")        updates.cancelled_at         = new Date().toISOString()
  if (status === "confirmed")        updates.confirmed_at         = new Date().toISOString()

  const { error } = await admin.from("referrals").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

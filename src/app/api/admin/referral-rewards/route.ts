import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  return !!data?.is_admin
}

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  const admin = createAdminClient()
  const { data } = await admin
    .from("referral_reward_configs")
    .select("*")
    .order("created_at", { ascending: false })
  return NextResponse.json({ rewards: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const { name, description, reward_type, reward_amount, trigger_status } = body
  if (!name || !reward_type || !trigger_status) {
    return NextResponse.json({ error: "Campos obrigatórios: nome, tipo e gatilho." }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("referral_reward_configs")
    .insert({ name, description: description || null, reward_type, reward_amount: Number(reward_amount) || 0, trigger_status })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reward: data })
}

export async function PATCH(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("referral_reward_configs").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await assertAdmin()) return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("referral_reward_configs").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

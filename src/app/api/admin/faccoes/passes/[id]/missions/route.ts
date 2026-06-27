import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()
  const { data } = await admin
    .from("contract_group_missions")
    .select("*")
    .eq("group_id", id)
    .order("position", { ascending: true })

  return NextResponse.json({ missions: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("contract_group_missions")
    .insert({
      group_id:      id,
      position:      body.position,
      title:         body.title,
      description:   body.description ?? "",
      total:         body.total ?? 1,
      points_reward: body.points_reward ?? 0,
      item_reward:   body.item_reward ?? null,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

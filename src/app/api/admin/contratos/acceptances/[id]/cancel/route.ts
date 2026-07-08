import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteDiscordChannel } from "@/lib/discord-bot"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()

  const { data: uc } = await admin
    .from("user_contracts")
    .select("id, discord_channel_id, contract_id, user_id")
    .eq("id", id)
    .single()

  if (!uc) return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 })

  // Cancela agendamentos pendentes do usuário neste contrato
  await admin
    .from("contract_schedules")
    .update({ status: "cancelled" })
    .eq("user_id", uc.user_id)
    .eq("contract_id", uc.contract_id)
    .eq("status", "scheduled")

  // Marca contrato como cancelado
  const { error } = await admin
    .from("user_contracts")
    .update({ status: "cancelled" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Remove canal Discord de aceitação
  deleteDiscordChannel(uc.discord_channel_id).catch(() => {})

  return NextResponse.json({ ok: true })
}

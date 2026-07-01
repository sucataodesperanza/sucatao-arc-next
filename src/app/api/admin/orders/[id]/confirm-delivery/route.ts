import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteDiscordChannel } from "@/lib/discord-bot"
import { alertItemEntregue } from "@/lib/discord-webhook"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const admin = createAdminClient()

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, payment_method, payment_status, delivered_at, discord_channel_id")
    .eq("id", id)
    .single()

  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
  if (order.payment_method !== "loja_oficial" || order.payment_status !== "paid") {
    return NextResponse.json({ error: "Pedido não está pronto para confirmação de entrega." }, { status: 409 })
  }
  if (order.delivered_at) {
    return NextResponse.json({ error: "Entrega já confirmada." }, { status: 409 })
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({ delivered_at: new Date().toISOString(), discord_channel_id: null })
    .eq("id", id)

  if (updateError) return NextResponse.json({ error: "Erro ao confirmar entrega." }, { status: 500 })

  if (order.discord_channel_id) {
    deleteDiscordChannel(order.discord_channel_id)
  }

  const { data: profile } = await admin.from("profiles").select("username, discord_username, game_id").eq("id", order.user_id).single()
  const userName = profile?.username ?? profile?.discord_username ?? "Comprador"
  alertItemEntregue({
    orderId: order.id,
    userName,
    gameId: profile?.game_id ?? "—",
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}

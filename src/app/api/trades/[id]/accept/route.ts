import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createPrivateChannel, embedTradeTicket } from "@/lib/discord-bot"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Verifica se o trade existe e está ativo
  const { data: trade } = await supabase
    .from("trades")
    .select("id, status, offer_points, want_item_name, want_item_qty")
    .eq("id", id)
    .eq("status", "active")
    .single()

  if (!trade) return NextResponse.json({ error: "Trade não encontrado ou inativo." }, { status: 404 })

  // Garante que apenas UMA pessoa pode aceitar este trade
  const { data: existingAcceptance } = await supabase
    .from("trade_acceptances")
    .select("id, user_id")
    .eq("trade_id", id)
    .neq("status", "cancelled")
    .single()

  if (existingAcceptance) {
    if (existingAcceptance.user_id === user.id) {
      return NextResponse.json({ error: "Você já aceitou este trade.", code: "already_accepted" }, { status: 409 })
    }
    return NextResponse.json({ error: "Este trade já foi aceito por outro usuário.", code: "taken" }, { status: 409 })
  }

  const { data: inserted, error } = await supabase
    .from("trade_acceptances")
    .insert({ trade_id: id, user_id: user.id, status: "pending" })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Você já aceitou este trade." }, { status: 409 })
    }
    return NextResponse.json({ error: "Erro ao aceitar trade." }, { status: 500 })
  }

  // Cria canal Discord — fire-and-forget
  if (inserted) {
    const adminSb = createAdminClient()
    adminSb.from("profiles")
      .select("username, discord_id, discord_username")
      .eq("id", user.id)
      .single()
      .then(async ({ data: profile }) => {
        const discordId = profile?.discord_id
        if (!discordId) return
        const playerName = profile?.username ?? profile?.discord_username ?? "Jogador"
        const embed = embedTradeTicket({
          acceptanceId: inserted.id,
          playerName,
          itemName:    trade.want_item_name,
          itemQty:     trade.want_item_qty,
          offerPoints: trade.offer_points,
        })
        const channelId = await createPrivateChannel({
          name: `trade-${inserted.id.slice(0, 8)}`,
          topic: `Trade com ${playerName} — ${trade.want_item_qty}× ${trade.want_item_name}`,
          buyerDiscordId: discordId,
          embed,
          categoryId: process.env.DISCORD_TRADES_CATEGORY_ID ?? process.env.DISCORD_ORDERS_CATEGORY_ID,
        })
        if (channelId) {
          await adminSb
            .from("trade_acceptances")
            .update({ discord_channel_id: channelId })
            .eq("id", inserted.id)
        }
      })
      .catch(() => {})
  }

  return NextResponse.json({ ok: true })
}

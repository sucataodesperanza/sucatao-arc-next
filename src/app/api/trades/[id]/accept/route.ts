import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createPrivateChannel, embedTradeTicket } from "@/lib/discord-bot"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Lê slot_id + game_id do body
  const body = await req.json().catch(() => ({}))
  const { slot_id, game_id } = body as { slot_id?: string; game_id?: string }
  if (!slot_id) return NextResponse.json({ error: "Selecione um horário." }, { status: 400 })
  if (!game_id?.trim()) return NextResponse.json({ error: "Informe seu Game ID." }, { status: 400 })

  // Valida slot
  const { data: slot } = await supabase
    .from("trade_slots")
    .select("id, scheduled_for, label")
    .eq("id", slot_id)
    .eq("active", true)
    .single()
  if (!slot) return NextResponse.json({ error: "Horário não encontrado." }, { status: 400 })

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
    .insert({
      trade_id:     id,
      user_id:      user.id,
      status:       "scheduled",
      slot_id,
      game_id:      game_id.trim(),
      scheduled_at: slot.scheduled_for,
    })
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
    ;(async () => {
      try {
        const adminSb = createAdminClient()
        const { data: profile } = await adminSb
          .from("profiles")
          .select("username, discord_id, discord_username")
          .eq("id", user.id)
          .single()
        const discordId = profile?.discord_id
        if (!discordId) return
        const playerName = profile?.username ?? profile?.discord_username ?? "Jogador"
        const embed = embedTradeTicket({
          acceptanceId: inserted.id,
          playerName,
          itemName:     trade.want_item_name,
          itemQty:      trade.want_item_qty,
          offerPoints:  trade.offer_points,
          gameId:       game_id.trim(),
          scheduledAt:  slot.scheduled_for,
        })
        const channelId = await createPrivateChannel({
          name:           `trade-${inserted.id.slice(0, 8)}`,
          topic:          `Trade com ${playerName} — ${trade.want_item_qty}× ${trade.want_item_name}`,
          buyerDiscordId: discordId,
          embed,
          categoryId:     process.env.DISCORD_TRADES_CATEGORY_ID ?? process.env.DISCORD_ORDERS_CATEGORY_ID,
        })
        if (channelId) {
          await adminSb
            .from("trade_acceptances")
            .update({ discord_channel_id: channelId })
            .eq("id", inserted.id)
        }
      } catch {}
    })()
  }

  return NextResponse.json({ ok: true })
}

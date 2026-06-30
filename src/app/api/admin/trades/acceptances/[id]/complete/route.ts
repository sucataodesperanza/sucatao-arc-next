import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendDiscordDM, dmRecompensaCreditada } from "@/lib/discord-bot"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()

  // Busca aceitação com trade (para saber os pontos)
  const { data: acceptance, error: fetchError } = await supabase
    .from("trade_acceptances")
    .select("id, user_id, status, trades(offer_points)")
    .eq("id", id)
    .single()

  if (fetchError || !acceptance) {
    return NextResponse.json({ error: "Aceitação não encontrada." }, { status: 404 })
  }
  if (acceptance.status === "completed") {
    return NextResponse.json({ error: "Trade já concluído." }, { status: 409 })
  }

  const trade = (Array.isArray(acceptance.trades) ? acceptance.trades[0] : acceptance.trades) as { offer_points: number } | null
  const points = trade?.offer_points ?? 0

  // 1. Marca aceitação como concluída
  const { error: updateError } = await supabase
    .from("trade_acceptances")
    .update({ status: "completed" })
    .eq("id", id)

  if (updateError) return NextResponse.json({ error: "Erro ao concluir trade." }, { status: 500 })

  // 2. Credita pontos na carteira do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("points, username, discord_id")
    .eq("id", acceptance.user_id)
    .single()

  if (points > 0) {
    const currentPoints = (profile as { points: number } | null)?.points ?? 0

    await supabase
      .from("profiles")
      .update({ points: currentPoints + points })
      .eq("id", acceptance.user_id)
  }

  // DM Discord ao jogador — fire-and-forget
  sendDiscordDM(
    (profile as { discord_id?: string | null } | null)?.discord_id,
    dmRecompensaCreditada((profile as { username?: string } | null)?.username ?? "Jogador", "Sua troca", { points }),
  )

  return NextResponse.json({ ok: true, points_credited: points })
}

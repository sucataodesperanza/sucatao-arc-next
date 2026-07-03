import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calcSlotsNeeded } from "@/lib/vault-stacking"
import { alertAgendamentoCofre } from "@/lib/discord-webhook"

// GET — lista os agendamentos do usuário para a expedição ativa
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ deposits: [] })

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { data: expedition } = await admin
    .from("expeditions")
    .select("id")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1)
    .maybeSingle()

  if (!expedition) return NextResponse.json({ deposits: [] })

  const { data } = await admin
    .from("expedition_vault_deposits")
    .select("id, type, items, slots_used, preferred_at, notes, status, admin_notes, created_at")
    .eq("user_id", user.id)
    .eq("expedition_id", expedition.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  return NextResponse.json({ deposits: data ?? [] })
}

// POST — cria um novo agendamento de entrega ou retirada
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { type, items, preferred_at, notes } = body

  if (!["deposit", "pickup"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Adicione pelo menos 1 item." }, { status: 400 })
  }
  for (const it of items) {
    if (!it.name || !it.rarity || typeof it.quantity !== "number" || it.quantity < 1) {
      return NextResponse.json({ error: "Item inválido na lista." }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  // Expedição ativa
  const { data: expedition } = await admin
    .from("expeditions")
    .select("id, name")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1)
    .maybeSingle()

  if (!expedition) {
    return NextResponse.json({ error: "Nenhuma expedição ativa no momento." }, { status: 409 })
  }

  // Slots do usuário
  const { data: pack } = await admin
    .from("expedition_vault_packs")
    .select("total_slots")
    .eq("user_id", user.id)
    .eq("expedition_id", expedition.id)
    .maybeSingle()

  if (!pack) {
    return NextResponse.json({ error: "Você não possui slots no cofre desta expedição. Compre pacotes na loja." }, { status: 409 })
  }

  // Slots já comprometidos em depósitos ativos
  const { data: activeDeposits } = await admin
    .from("expedition_vault_deposits")
    .select("slots_used")
    .eq("user_id", user.id)
    .eq("expedition_id", expedition.id)
    .in("status", ["scheduled", "in_storage"])

  const slotsCommitted = (activeDeposits ?? []).reduce((s, d) => s + d.slots_used, 0)
  const slotsAvailable = pack.total_slots - slotsCommitted

  const slotsNeeded = calcSlotsNeeded(items)

  if (type === "deposit" && slotsNeeded > slotsAvailable) {
    return NextResponse.json({
      error: `Slots insuficientes. Disponível: ${slotsAvailable}, necessário: ${slotsNeeded}.`,
    }, { status: 409 })
  }

  // Perfil do usuário para Discord
  const { data: profile } = await admin
    .from("profiles")
    .select("game_id, discord_id")
    .eq("id", user.id)
    .maybeSingle()

  const userName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Desconhecido"

  const { data: deposit, error } = await admin
    .from("expedition_vault_deposits")
    .insert({
      user_id:       user.id,
      expedition_id: expedition.id,
      type,
      items,
      slots_used:    type === "deposit" ? slotsNeeded : 0,
      preferred_at:  preferred_at ?? null,
      notes:         notes ?? null,
      status:        "scheduled",
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  alertAgendamentoCofre({
    depositId:      deposit.id,
    userName,
    gameId:         profile?.game_id ?? "—",
    expeditionName: expedition.name,
    type,
    items,
    slotsUsed:      type === "deposit" ? slotsNeeded : 0,
    preferredAt:    preferred_at ?? null,
    notes:          notes ?? null,
  }).catch(() => {})

  return NextResponse.json({ deposit, slotsNeeded })
}

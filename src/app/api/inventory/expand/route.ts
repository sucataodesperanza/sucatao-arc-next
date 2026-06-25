import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const INITIAL_CAPACITY = 100
const PACK_SIZE        = 25
const POINTS_PER_PACK  = 10000 // 10k × número do pacote (1º=10k, 2º=20k...)
const BRL_BASE         = 5     // R$5 por pack nos primeiros 100 extras
const BRL_STEP_EVERY   = 100   // a cada 100 extras comprados, sobe R$5

/** Preço em pontos do próximo pacote: 1º=10k, 2º=20k, 3º=30k... */
export function nextPackPointsPrice(extraSlots: number): number {
  const packNumber = Math.floor(extraSlots / PACK_SIZE) + 1
  return packNumber * POINTS_PER_PACK
}

/** Preço em BRL do próximo pacote: +25 custa R$5 → R$5 → R$10 → R$10 → ... */
export function nextPackBrlPrice(extraSlots: number): number {
  const tier = Math.floor(extraSlots / BRL_STEP_EVERY)
  return (tier + 1) * BRL_BASE
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const mode: "points" | "cash" = body.mode === "cash" ? "cash" : "points"

  const { data: profile } = await supabase
    .from("profiles")
    .select("points, inventory_capacity")
    .eq("id", user.id)
    .single()

  if (!profile) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 })

  const extraSlots  = (profile.inventory_capacity ?? INITIAL_CAPACITY) - INITIAL_CAPACITY
  const pointsPrice = nextPackPointsPrice(extraSlots)
  const brlPrice    = nextPackBrlPrice(extraSlots)

  if (mode === "cash") {
    // PIX para expansão de inventário — em breve
    return NextResponse.json({
      error: "Pagamento via PIX para inventário em breve. Use pontos por enquanto.",
      brl_price: brlPrice,
    }, { status: 501 })
  }

  // ── Modo pontos ──────────────────────────────────────────────────────────

  const currentPoints = profile.points ?? 0
  if (currentPoints < pointsPrice) {
    return NextResponse.json({
      error: `Pontos insuficientes. Você precisa de ${pointsPrice.toLocaleString("pt-BR")} pontos.`,
    }, { status: 409 })
  }

  const newCapacity = (profile.inventory_capacity ?? INITIAL_CAPACITY) + PACK_SIZE
  const { error } = await supabase
    .from("profiles")
    .update({ points: currentPoints - pointsPrice, inventory_capacity: newCapacity })
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: "Erro ao expandir inventário." }, { status: 500 })

  return NextResponse.json({
    ok:           true,
    new_capacity: newCapacity,
    points_spent: pointsPrice,
    points_left:  currentPoints - pointsPrice,
  })
}

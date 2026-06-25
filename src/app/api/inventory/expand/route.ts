import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { INITIAL_CAPACITY, PACK_SIZE, nextPackPointsPrice, nextPackBrlPrice } from "@/lib/inventory-pricing"

export { nextPackPointsPrice, nextPackBrlPrice } // re-exporta para compatibilidade

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

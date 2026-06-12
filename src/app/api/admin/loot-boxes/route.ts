import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const RARITIES = ["common", "rare", "epic", "legendary"] as const

function validateDropRates(value: unknown): { common: number; rare: number; epic: number; legendary: number } | null {
  if (typeof value !== "object" || value === null) return null
  const obj = value as Record<string, unknown>
  const rates = { common: 0, rare: 0, epic: 0, legendary: 0 }
  let total = 0

  for (const rarity of RARITIES) {
    const n = Number(obj[rarity])
    if (!Number.isFinite(n) || n < 0 || n > 100) return null
    rates[rarity] = n
    total += n
  }

  if (total !== 100) return null
  return rates
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("loot_boxes")
    .select("id, name, price, image_url, rarity, description, possible_rewards, drop_rates, times_opened, total_revenue, status, created_at")
    .order("price", { ascending: true })

  if (error) {
    console.error("api/admin/loot-boxes GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar loot boxes." }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const price = Number(body.price)
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : ""
  const rarity = RARITIES.includes(body.rarity) ? body.rarity : null
  const description = typeof body.description === "string" ? body.description.trim() : ""
  const possibleRewards = Array.isArray(body.possible_rewards)
    ? body.possible_rewards.filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0).map((r: string) => r.trim())
    : []
  const dropRates = validateDropRates(body.drop_rates)
  const status = body.status === "inactive" ? "inactive" : "active"

  if (!name) {
    return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
  }

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Preço deve ser maior que zero." }, { status: 400 })
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "URL da imagem é obrigatória." }, { status: 400 })
  }

  if (!rarity) {
    return NextResponse.json({ error: "Raridade inválida." }, { status: 400 })
  }

  if (!description) {
    return NextResponse.json({ error: "Descrição é obrigatória." }, { status: 400 })
  }

  if (possibleRewards.length === 0) {
    return NextResponse.json({ error: "Adicione pelo menos uma recompensa possível." }, { status: 400 })
  }

  if (!dropRates) {
    return NextResponse.json({ error: "As taxas de drop devem somar 100%." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("loot_boxes").insert({
    name,
    price,
    image_url: imageUrl,
    rarity,
    description,
    possible_rewards: possibleRewards,
    drop_rates: dropRates,
    status,
  })

  if (error) {
    console.error("api/admin/loot-boxes POST error:", error)
    return NextResponse.json({ error: "Erro ao criar loot box." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

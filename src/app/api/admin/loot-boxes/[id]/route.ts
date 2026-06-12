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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : ""
    if (!name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })
    update.name = name
  }

  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Preço deve ser maior que zero." }, { status: 400 })
    }
    update.price = price
  }

  if (body.image_url !== undefined) {
    const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : ""
    if (!imageUrl) return NextResponse.json({ error: "URL da imagem é obrigatória." }, { status: 400 })
    update.image_url = imageUrl
  }

  if (body.rarity !== undefined) {
    if (!RARITIES.includes(body.rarity)) {
      return NextResponse.json({ error: "Raridade inválida." }, { status: 400 })
    }
    update.rarity = body.rarity
  }

  if (body.description !== undefined) {
    const description = typeof body.description === "string" ? body.description.trim() : ""
    if (!description) return NextResponse.json({ error: "Descrição é obrigatória." }, { status: 400 })
    update.description = description
  }

  if (body.possible_rewards !== undefined) {
    const possibleRewards = Array.isArray(body.possible_rewards)
      ? body.possible_rewards.filter((r: unknown): r is string => typeof r === "string" && r.trim().length > 0).map((r: string) => r.trim())
      : []
    if (possibleRewards.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos uma recompensa possível." }, { status: 400 })
    }
    update.possible_rewards = possibleRewards
  }

  if (body.drop_rates !== undefined) {
    const dropRates = validateDropRates(body.drop_rates)
    if (!dropRates) return NextResponse.json({ error: "As taxas de drop devem somar 100%." }, { status: 400 })
    update.drop_rates = dropRates
  }

  if (body.status === "active" || body.status === "inactive") update.status = body.status

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("loot_boxes").update(update).eq("id", id)

  if (error) {
    console.error("api/admin/loot-boxes/[id] PATCH error:", error)
    return NextResponse.json({ error: "Erro ao atualizar loot box." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id } = await params
  const supabase = createAdminClient()
  const { error } = await supabase.from("loot_boxes").delete().eq("id", id)

  if (error) {
    console.error("api/admin/loot-boxes/[id] DELETE error:", error)
    return NextResponse.json({ error: "Erro ao remover loot box." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

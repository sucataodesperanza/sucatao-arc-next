/**
 * Utilitário de precificação baseado em VEI.
 * Busca os multiplicadores de economy_settings e calcula os preços.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { calcVei } from "@/lib/vei"

export interface PriceResult {
  price_points: number
  price_cash: number
  vei: number
}

export async function calcItemPrice(
  itemId: string,
  options?: { points_multiplier?: number; cash_multiplier?: number }
): Promise<PriceResult> {
  const admin = createAdminClient()

  // Busca multiplicadores (usa opções passadas ou busca do banco)
  let pointsMult = options?.points_multiplier
  let cashMult   = options?.cash_multiplier

  if (pointsMult === undefined || cashMult === undefined) {
    const { data: settings } = await admin
      .from("economy_settings")
      .select("points_multiplier, cash_multiplier")
      .eq("id", 1)
      .single()
    pointsMult = Number(settings?.points_multiplier ?? 100)
    cashMult   = Number(settings?.cash_multiplier   ?? 0.10)
  }

  // Busca VEI do item (se já calculado)
  const { data: economics } = await admin
    .from("item_economics")
    .select("vei")
    .eq("item_id", itemId)
    .single()

  let vei = Number(economics?.vei ?? 0)

  // Se não tem VEI ainda, calcula on-the-fly
  if (!vei) {
    const { data: item } = await admin
      .from("catalog_items")
      .select("value, rarity, item_type")
      .eq("id", itemId)
      .single()
    if (item) vei = calcVei(item.value, item.rarity, item.item_type)
  }

  return {
    price_points: Math.max(1, Math.round(vei * pointsMult)),
    price_cash:   Math.max(0.01, parseFloat((vei * cashMult).toFixed(2))),
    vei,
  }
}

/**
 * Busca os multiplicadores atuais.
 */
export async function getEconomySettings() {
  const admin = createAdminClient()
  const { data } = await admin.from("economy_settings").select("points_multiplier, cash_multiplier").eq("id", 1).single()
  return {
    points_multiplier: Number(data?.points_multiplier ?? 100),
    cash_multiplier:   Number(data?.cash_multiplier   ?? 0.10),
  }
}

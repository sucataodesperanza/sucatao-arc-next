/**
 * VEI — Valor Econômico do Item
 *
 * Fórmula inicial (PDF spec):
 *   valor de venda: 50%
 *   raridade:       30%
 *   categoria:      20%
 *
 * Escala: 0 a 100
 */

// Pesos de raridade (0-10)
const RARITY_SCORE: Record<string, number> = {
  Common:    1,
  Uncommon:  3,
  Rare:      5,
  Epic:      7,
  Legendary: 10,
}

// Pesos de categoria (0-10)
const CATEGORY_SCORE: Record<string, number> = {
  weapon:      10,
  Weapon:      10,
  armor:        8,
  Armor:        8,
  tool:         6,
  Tool:         6,
  material:     4,
  Material:     4,
  consumable:   3,
  Consumable:   3,
  misc:         1,
  Misc:         1,
}

/**
 * Calcula o VEI de um item.
 * @param sellValue  valor de venda no jogo
 * @param rarity     raridade (Common, Uncommon, Rare, Epic, Legendary)
 * @param category   categoria do item
 * @param maxSellValue  valor máximo de referência para normalização (padrão: 50000)
 */
export function calcVei(
  sellValue: number | null,
  rarity: string | null,
  category: string | null,
  maxSellValue = 50000
): number {
  const sellNorm  = Math.min(1, (sellValue ?? 0) / maxSellValue) * 10 // 0-10
  const rarScore  = RARITY_SCORE[rarity  ?? "Common"]   ?? 1
  const catScore  = CATEGORY_SCORE[category ?? "misc"]  ?? 1

  const raw = sellNorm * 0.5 + rarScore * 0.3 + catScore * 0.2

  // Escala para 0-100
  const maxPossible = 10 * 0.5 + 10 * 0.3 + 10 * 0.2 // = 10
  return parseFloat(((raw / maxPossible) * 100).toFixed(4))
}

/**
 * Calcula o liquidity_score baseado no trade_count e weekly_demand.
 * Escala: 0-100
 */
export function calcLiquidity(tradeCount: number, weeklyDemand: number): number {
  const score = Math.min(100, tradeCount * 0.5 + weeklyDemand * 2)
  return parseFloat(score.toFixed(2))
}

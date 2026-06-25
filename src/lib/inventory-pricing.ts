/** Utilitários de preço para expansão de inventário.
 *  Arquivo puro (sem deps de servidor) — pode ser importado em client e server. */

const INITIAL_CAPACITY = 100
const PACK_SIZE        = 25
const POINTS_PER_PACK  = 10000
const BRL_BASE         = 5
const BRL_STEP_EVERY   = 100

export { INITIAL_CAPACITY, PACK_SIZE }

/** Preço em pontos do próximo pacote: 1º=10k, 2º=20k, 3º=30k... */
export function nextPackPointsPrice(extraSlots: number): number {
  const packNumber = Math.floor(extraSlots / PACK_SIZE) + 1
  return packNumber * POINTS_PER_PACK
}

/** Preço em BRL do próximo pacote: sobe R$5 a cada 100 extras comprados */
export function nextPackBrlPrice(extraSlots: number): number {
  const tier = Math.floor(extraSlots / BRL_STEP_EVERY)
  return (tier + 1) * BRL_BASE
}

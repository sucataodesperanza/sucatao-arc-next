/**
 * Utilitário para registrar movimentos econômicos em economy_logs.
 * Usar em: loja, trades, contratos, recompensas, admin.
 */

import { createAdminClient } from "@/lib/supabase/admin"

export type EconomySource =
  | "shop"       // compra na loja
  | "trade"      // trade aceito
  | "contract"   // recompensa de contrato
  | "auction"    // leilão
  | "lottery"    // sorteio
  | "inventory"  // adição ao inventário
  | "reward"     // recompensa diversa
  | "admin"            // ação manual do admin
  | "expedition_vault" // compra de pacote de cofre de expedição

export type EconomyAction =
  | "buy"        // comprou item
  | "sell"       // vendeu item
  | "trade"      // trocou item
  | "reward"     // recebeu recompensa
  | "spend"      // gastou pontos
  | "earn"       // ganhou pontos

export interface LogEconomyParams {
  player_id: string
  action: EconomyAction
  value: number
  currency?: "points" | "cash"
  item_id?: string | null
  item_qty?: number
  source: EconomySource
  source_id?: string | null
  metadata?: Record<string, unknown>
}

export async function logEconomy(params: LogEconomyParams) {
  try {
    const admin = createAdminClient()
    await admin.from("economy_logs").insert({
      player_id:  params.player_id,
      action:     params.action,
      value:      params.value,
      currency:   params.currency ?? "points",
      item_id:    params.item_id  ?? null,
      item_qty:   params.item_qty ?? 1,
      source:     params.source,
      source_id:  params.source_id ?? null,
      metadata:   params.metadata  ?? null,
    })
  } catch (err) {
    // Não deixa o log quebrar o fluxo principal
    console.error("[economy_log] Falha ao registrar:", err)
  }
}

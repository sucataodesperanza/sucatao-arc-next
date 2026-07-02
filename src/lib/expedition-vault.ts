import { createAdminClient } from "@/lib/supabase/admin"

export type CreditResult =
  | { ok: true; expeditionId: string; expeditionName: string; totalSlots: number }
  | { ok: false; error: string }

/**
 * Credita pacotes de cofre de expedição ao usuário.
 * Busca a expedição ativa no momento e faz upsert em expedition_vault_packs.
 * Retorna erro se não houver expedição ativa.
 */
export async function creditExpeditionVaultPacks(
  userId: string,
  packsCount: number,
): Promise<CreditResult> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: expedition } = await admin
    .from("expeditions")
    .select("id, name, slots_per_pack")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!expedition) {
    return { ok: false, error: "Nenhuma expedição ativa no momento." }
  }

  const slotsToAdd = expedition.slots_per_pack * packsCount

  const { data: existing } = await admin
    .from("expedition_vault_packs")
    .select("id, packs_count, total_slots")
    .eq("user_id", userId)
    .eq("expedition_id", expedition.id)
    .maybeSingle()

  if (existing) {
    const newPacks = existing.packs_count + packsCount
    const newSlots = existing.total_slots + slotsToAdd
    await admin
      .from("expedition_vault_packs")
      .update({ packs_count: newPacks, total_slots: newSlots, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
    return { ok: true, expeditionId: expedition.id, expeditionName: expedition.name, totalSlots: newSlots }
  }

  await admin
    .from("expedition_vault_packs")
    .insert({ user_id: userId, expedition_id: expedition.id, packs_count: packsCount, total_slots: slotsToAdd })

  return { ok: true, expeditionId: expedition.id, expeditionName: expedition.name, totalSlots: slotsToAdd }
}

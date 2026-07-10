import { createAdminClient } from "@/lib/supabase/admin"

type AdminClient = ReturnType<typeof createAdminClient>

async function creditUser(
  admin: AdminClient,
  userId: string,
  rewardType: string,
  amount: number,
  itemId?: string | null,
) {
  if (amount <= 0) return
  if (rewardType === "points") {
    const { data } = await admin.from("profiles").select("reputation").eq("id", userId).single()
    if (data) await admin.from("profiles").update({ reputation: (data.reputation ?? 0) + amount }).eq("id", userId)
  } else if (rewardType === "sucatas") {
    const { data } = await admin.from("profiles").select("sucatas").eq("id", userId).single()
    if (data) await admin.from("profiles").update({ sucatas: (data.sucatas ?? 0) + amount }).eq("id", userId)
  } else if (rewardType === "item" && itemId) {
    const { data: existing } = await admin
      .from("user_inventory")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("item_id", itemId)
      .single()
    if (existing) {
      await admin.from("user_inventory").update({ quantity: existing.quantity + amount }).eq("id", existing.id)
    } else {
      await admin.from("user_inventory").insert({ user_id: userId, item_id: itemId, quantity: amount })
    }
  }
  // item sem item_id configurado: registrado na tabela mas sem crédito automático
}

export async function deliverRewards(referralId: string, newStatus: string, admin: AdminClient) {
  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_id, referred_id")
    .eq("id", referralId)
    .single()
  if (!referral) return

  const { data: configs } = await admin
    .from("referral_reward_configs")
    .select("*")
    .eq("trigger_status", newStatus)
    .eq("active", true)
  if (!configs?.length) return

  const { data: delivered } = await admin
    .from("referral_reward_deliveries")
    .select("config_id")
    .eq("referral_id", referralId)
  const deliveredSet = new Set((delivered ?? []).map((d: { config_id: string }) => d.config_id))

  const pending = configs.filter((c: { id: string }) => !deliveredSet.has(c.id))
  if (!pending.length) return

  await Promise.all(pending.map(async (config: {
    id: string; reward_type: string; reward_amount: number; reward_amount_referred: number; item_id?: string | null
  }) => {
    await Promise.all([
      creditUser(admin, referral.referrer_id, config.reward_type, config.reward_amount, config.item_id),
      referral.referred_id
        ? creditUser(admin, referral.referred_id, config.reward_type, config.reward_amount_referred, config.item_id)
        : Promise.resolve(),
    ])
    await admin.from("referral_reward_deliveries").insert({ referral_id: referralId, config_id: config.id })
  }))
}

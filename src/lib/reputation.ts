import { createAdminClient } from "@/lib/supabase/admin"

export type ReputationSource = "trade" | "contract" | "daily_streak" | "admin"

const DEFAULT_POINTS: Record<string, number> = { trade: 50, contract: 100, daily_streak: 10 }

export async function getRepPoints(source: ReputationSource): Promise<number> {
  if (source === "admin") return 0
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("reputation_settings")
      .select("points")
      .eq("source", source)
      .single()
    return (data as { points: number } | null)?.points ?? DEFAULT_POINTS[source] ?? 0
  } catch {
    return DEFAULT_POINTS[source] ?? 0
  }
}

export const REPUTATION_LEVELS = [
  { min: 0,     name: "Sucateiro de Fundo",   icon: "Trash2",      color: "#566171" },
  { min: 200,   name: "Mascate Novato",        icon: "ShoppingBag", color: "#8b99aa" },
  { min: 500,   name: "Coletor Experiente",    icon: "Package",     color: "#3df28b" },
  { min: 1000,  name: "Negociante Confiável",  icon: "Scale",       color: "#5fa8ff" },
  { min: 2500,  name: "Mercador Veterano",     icon: "BarChart2",   color: "#b477ff" },
  { min: 5000,  name: "Fornecedor Respeitado", icon: "Medal",       color: "#ffd400" },
  { min: 10000, name: "Atravessador de Elite", icon: "Star",        color: "#ff8c00" },
  { min: 20000, name: "Lenda da Sucatão",      icon: "Crown",       color: "#ff4d6a" },
] as const

export type ReputationLevel = (typeof REPUTATION_LEVELS)[number]

export function getReputationLevel(points: number): ReputationLevel {
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (points >= REPUTATION_LEVELS[i].min) return REPUTATION_LEVELS[i]
  }
  return REPUTATION_LEVELS[0]
}

export function getNextLevel(points: number): ReputationLevel | null {
  for (const level of REPUTATION_LEVELS) {
    if (level.min > points) return level
  }
  return null
}

export async function addReputation(
  userId: string,
  amount: number,
  source: ReputationSource,
  reason: string,
  refId?: string,
) {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("reputation, reputation_streak, last_activity_date")
    .eq("id", userId)
    .single()

  const current = (profile as { reputation: number } | null)?.reputation ?? 0

  // Lógica de streak diário
  let streak = (profile as { reputation_streak: number } | null)?.reputation_streak ?? 0
  const lastDate = (profile as { last_activity_date: string | null } | null)?.last_activity_date
  const today = new Date().toISOString().slice(0, 10)

  if (source === "daily_streak") {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (lastDate === yesterday) {
      streak += 1
    } else if (lastDate !== today) {
      streak = 1
    }
  }

  await supabase
    .from("profiles")
    .update({
      reputation: current + amount,
      ...(source === "daily_streak" ? { reputation_streak: streak, last_activity_date: today } : {}),
    })
    .eq("id", userId)

  await supabase.from("reputation_history").insert({
    user_id:  userId,
    amount,
    reason,
    source,
    ref_id:   refId ?? null,
  })
}

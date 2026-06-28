/**
 * Cache utilitário usando Next.js unstable_cache com createAdminClient().
 *
 * Por que createAdminClient()? Porque unstable_cache não funciona com
 * createClient() (que lê cookies de request). O admin client usa apenas
 * variáveis de ambiente — totalmente cacheável.
 *
 * Tags permitem invalidação cirúrgica via revalidateTag() nas rotas admin.
 */

import { unstable_cache, revalidateTag as _revalidateTag } from "next/cache"

// Wrapper para compatibilidade com a assinatura do Next.js 16
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function revalidateTag(tag: string) { return (_revalidateTag as any)(tag) }
import { createAdminClient } from "@/lib/supabase/admin"

// ── TTLs em segundos ──────────────────────────────────────────────────
const TTL = {
  home:      5  * 60,   // 5 min  — muda só quando admin edita
  faccoes:   5  * 60,   // 5 min  — membros atualizam com ações
  mapas:     30 * 60,   // 30 min — raramente muda
  arcpedia:  60 * 60,   // 1h     — sync MetaForge manual
  trades:    30,        // 30s    — trades entram/saem com frequência
  contratos: 60,        // 1 min  — contratos ativos mudam
  catalog:   60 * 60,   // 1h     — sync MetaForge manual
} as const

// ── Home ──────────────────────────────────────────────────────────────
export const getCachedHomeContent = unstable_cache(
  async () => {
    const db = createAdminClient()
    const [news, slides] = await Promise.all([
      db.from("home_news").select("id,date_label,title,text,image_url,href,icon_name,position").eq("active", true).order("position"),
      db.from("home_slides").select("id,tag,icon_name,image_url,title,text,cta_label,cta_href,position").eq("active", true).order("position"),
    ])
    return { news: news.data ?? [], slides: slides.data ?? [] }
  },
  ["home-content"],
  { revalidate: TTL.home, tags: ["home-content"] }
)

// ── Facções ───────────────────────────────────────────────────────────
export const getCachedFactions = unstable_cache(
  async () => {
    const db = createAdminClient()
    const { data } = await db.from("factions")
      .select("id,slug,name,tagline,description,color,icon_url,bonuses,attributes,active,position")
      .eq("active", true).order("position")
    return data ?? []
  },
  ["factions-list"],
  { revalidate: TTL.faccoes, tags: ["factions"] }
)

// ── Mapas ─────────────────────────────────────────────────────────────
export const getCachedMaps = unstable_cache(
  async () => {
    const db = createAdminClient()
    const [maps, markers] = await Promise.all([
      db.from("maps").select("id,name,label,description,image_url,status,index").order("index"),
      db.from("map_markers").select("id,map_id,type,x,y,title,note").eq("active", true),
    ])
    return { maps: maps.data ?? [], markers: markers.data ?? [] }
  },
  ["maps-content"],
  { revalidate: TTL.mapas, tags: ["maps"] }
)

// ── Trades ativos ─────────────────────────────────────────────────────
export const getCachedActiveContracts = unstable_cache(
  async () => {
    const db = createAdminClient()
    // Exclui trades já aceitos
    const { data: accepted } = await db.from("trade_acceptances").select("trade_id").neq("status", "cancelled")
    const excludeIds = (accepted ?? []).map(a => a.trade_id)
    let q = db.from("trades").select("id,offer_points,want_item_name,want_item_qty,want_item_icon,want_item_rarity,status,expires_at,created_at,faction_id").eq("status", "active").order("created_at", { ascending: false })
    if (excludeIds.length > 0) q = q.not("id", "in", `(${excludeIds.join(",")})`)
    const { data } = await q
    return data ?? []
  },
  ["trades-active"],
  { revalidate: TTL.trades, tags: ["trades"] }
)

// ── Contratos à venda ─────────────────────────────────────────────────
export const getCachedContractGroups = unstable_cache(
  async () => {
    const db = createAdminClient()
    const [groups, missionCounts] = await Promise.all([
      db.from("contract_groups").select("id,title,description,type,starts_at,expires_at,price_points,price_real,faction_id,image_url").is("faction_id", null).eq("active", true).gte("expires_at", new Date().toISOString()).order("starts_at"),
      db.from("contract_group_missions").select("group_id,points_reward"),
    ])
    const countMap: Record<string, number> = {}
    const pointsMap: Record<string, number> = {}
    for (const m of missionCounts.data ?? []) {
      countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
      pointsMap[m.group_id] = (pointsMap[m.group_id] ?? 0) + (m.points_reward ?? 0)
    }
    return (groups.data ?? []).map(g => ({ ...g, missions_count: countMap[g.id] ?? 0, total_points: pointsMap[g.id] ?? 0 }))
  },
  ["contract-groups-public"],
  { revalidate: TTL.contratos, tags: ["contract-groups"] }
)

// ── Arcpedia ──────────────────────────────────────────────────────────
export const getCachedArcs = unstable_cache(
  async () => {
    const db = createAdminClient()
    const { data } = await db.from("arcs").select("id,name,type,threat,weakness,description,drops,icon_url,image_url").order("name")
    return data ?? []
  },
  ["arcs-list"],
  { revalidate: TTL.arcpedia, tags: ["arcs"] }
)

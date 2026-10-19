import { createAdminClient } from "@/lib/supabase/admin"
import type { ReadyKit } from "@/lib/ready-kits"
export async function readReadyKits() {
  const { data, error } = await createAdminClient().from("app_entities").select("id,payload").eq("entity_type", "ready_kit").limit(1000)
  if (error) throw new Error("Não foi possível carregar os kits.")
  return (data ?? []).map(row => ({ ...row.payload, id: row.id }) as ReadyKit).sort((a,b) => Number(b.featured)-Number(a.featured) || a.position-b.position || a.name.localeCompare(b.name))
}
export async function readReadyKitItems() {
  const db = createAdminClient()
  const catalog: { id: string; name: string; item_type: string; is_weapon: boolean; rarity: string; icon_url: string }[] = []
  const quantities = new Map<string, number>()
  for (let offset = 0; ; offset += 1000) {
    const [page, stock] = await Promise.all([
      db.from("catalog_items").select("id,name,item_type,is_weapon,rarity,icon_url").eq("active", true).order("id").range(offset, offset + 999),
      db.from("stock_items").select("catalog_item_id,quantity").order("catalog_item_id").range(offset, offset + 999),
    ])
    if (page.error || stock.error) throw new Error("Não foi possível carregar os itens.")
    catalog.push(...(page.data ?? []))
    for (const row of stock.data ?? []) quantities.set(row.catalog_item_id, (quantities.get(row.catalog_item_id) ?? 0) + (row.quantity ?? 0))
    if ((page.data?.length ?? 0) < 1000 && (stock.data?.length ?? 0) < 1000) break
  }
  return catalog.map(i => ({ id:i.id, name:i.name, type:i.item_type, isWeapon:i.is_weapon, rarity:i.rarity, image:i.icon_url, quantity:quantities.get(i.id) ?? 0 })).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"))
}

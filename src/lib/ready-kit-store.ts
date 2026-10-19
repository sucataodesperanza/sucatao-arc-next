import { createAdminClient } from "@/lib/supabase/admin"
import type { ReadyKit } from "@/lib/ready-kits"
export async function readReadyKits() {
  const { data, error } = await createAdminClient().from("app_entities").select("id,payload").eq("entity_type", "ready_kit").limit(100)
  if (error) throw new Error("Não foi possível carregar os kits.")
  return (data ?? []).map(row => ({ ...row.payload, id: row.id }) as ReadyKit).sort((a,b) => Number(b.featured)-Number(a.featured) || a.position-b.position || a.name.localeCompare(b.name))
}
export async function readReadyKitItems() {
  const db = createAdminClient()
  const [{ data, error }, stock] = await Promise.all([db.from("catalog_items").select("id,name,item_type,rarity,icon_url").eq("active", true).order("name").limit(5000), db.from("stock_items").select("catalog_item_id,quantity").limit(5000)])
  if (error || stock.error) throw new Error("Não foi possível carregar os itens.")
  return (data ?? []).map(i => ({ id:i.id, name:i.name, type:i.item_type, rarity:i.rarity, image:i.icon_url, quantity:(stock.data ?? []).filter(s=>s.catalog_item_id===i.id).reduce((n,s)=>n+(s.quantity??0),0) }))
}

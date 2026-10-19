import { createAdminClient } from "@/lib/supabase/admin"
import type { CatalogItem } from "@/lib/catalog"
import type { SavedWeaponKit } from "@/lib/weapon-kits"

export const WEAPON_KIT_ENTITY = "weapon_kit"
export async function readWeaponKits(publicOnly = false) {
  let query = createAdminClient().from("app_entities").select("id,payload").eq("entity_type", WEAPON_KIT_ENTITY)
  if (publicOnly) query = query.eq("payload->>active", "true").eq("payload->>featured", "true")
  const { data, error } = await query.limit(100)
  if (error) throw new Error("Não foi possível carregar os kits.")
  return (data ?? []).map(row => ({ ...row.payload, id: row.id }) as SavedWeaponKit).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"))
}

export async function readWeaponKitCatalog(): Promise<CatalogItem[]> {
  const { data, error } = await createAdminClient().from("catalog_items")
    .select("id,name,item_type,is_weapon,is_blueprint,icon_url,rarity")
    .eq("active", true).or("item_type.eq.Weapon,item_type.eq.Modification,is_weapon.eq.true").order("name").limit(1000)
  if (error) throw new Error("Não foi possível carregar os componentes.")
  return (data ?? []).map(item => ({ id: item.id, name: item.name, type: item.item_type, isWeapon: item.is_weapon, isBlueprint: item.is_blueprint, image: item.icon_url, rarity: item.rarity }))
}

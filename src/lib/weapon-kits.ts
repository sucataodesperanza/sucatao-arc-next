import type { CatalogItem } from "@/lib/catalog"
import { acceptsLoadoutItem, getWeaponAttachmentSlots, getWeaponProfile, loadoutPurchaseIssue, type LoadoutDraft } from "@/lib/loadout"

export function suggestedWeaponKit(weapon: CatalogItem, items: CatalogItem[]): LoadoutDraft {
  const draft: LoadoutDraft = { "weapon-1": { itemId: weapon.id, quantity: 1 } }
  for (const slot of getWeaponAttachmentSlots(weapon, "weapon-1")) {
    const mods = items.filter(item => acceptsLoadoutItem("attachment", item, weapon, slot.attachmentType))
      .sort((a, b) => Number((b.quantity ?? 0) > 0) - Number((a.quantity ?? 0) > 0) || Number(/iii|acolchoada|horizontal/i.test(b.name)) - Number(/iii|acolchoada|horizontal/i.test(a.name)) || a.name.localeCompare(b.name, "pt-BR"))
    if (mods[0]) draft[slot.id] = { itemId: mods[0].id, quantity: 1 }
  }
  return draft
}

export function suggestedKitWeapons(items: CatalogItem[]) {
  return ["osprey", "renegade", "aphelion"].flatMap(family => {
    const candidates = items.filter(item => {
      const profile = getWeaponProfile(item)
      return profile?.family === family && (family === "aphelion" ? profile.name === "Amplified Aphelion" : / IV$/.test(profile.name))
    }).sort((a, b) => Number((b.quantity ?? 0) > 0) - Number((a.quantity ?? 0) > 0))
    return candidates[0] ? [candidates[0]] : []
  })
}

export function weaponKitPurchaseIssues(rows: { item: CatalogItem; quantity: number }[], count: number, mode: "points" | "cash", stock: CatalogItem[], cart: { itemId: string; quantity: number }[]) {
  return rows.map(({ item, quantity }) => ({ item, issue: loadoutPurchaseIssue(item.id, quantity * count, mode, stock, cart) })).filter(row => row.issue)
}

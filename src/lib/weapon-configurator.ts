import type { CatalogItem } from "@/lib/catalog"
import { acceptsLoadoutItem, getWeaponAttachmentSlots, getWeaponProfile, type LoadoutDraft } from "@/lib/loadout"
import { acceptsWeaponStencil } from "@/lib/weapon-stencils"

export function weaponLevel(item: CatalogItem) {
  const profile = getWeaponProfile(item)
  return profile?.name.startsWith("Amplified ") ? "V" : profile?.name.match(/\s(IV|III|II|I)$/)?.[1] ?? "base"
}
export function weaponUpgrades(item: CatalogItem) {
  return getWeaponProfile(item)?.name.match(/\(([^)]+)\)$/)?.[1].split(",").map(name => name.trim()).sort() ?? []
}
export function describeWeaponConfiguration(item: CatalogItem) {
  const profile = getWeaponProfile(item)
  if (!profile) return null
  return { item, profile, family: profile.family, level: profile.name.startsWith("Amplified ") ? "V" : profile.name.match(/\s(IV|III|II|I)$/)?.[1] ?? "base", upgrades: profile.name.match(/\(([^)]+)\)$/)?.[1].split(",").map(name => name.trim()).sort() ?? [] }
}
export function findWeaponConfiguration(items: CatalogItem[], family: string, level: string, upgrades: string[] = []) {
  return items.filter(item => getWeaponProfile(item)?.family === family && weaponLevel(item) === level && weaponUpgrades(item).join("|") === [...upgrades].sort().join("|"))
    .sort((a, b) => Number((b.quantity ?? 0) > 0) - Number((a.quantity ?? 0) > 0))[0]
}
export function changeConfiguredWeapon(draft: LoadoutDraft, target: CatalogItem, items: CatalogItem[]) {
  const next: LoadoutDraft = { "weapon-1": { itemId: target.id, quantity: 1 } }
  const previous = items.find(item => item.id === draft["weapon-1"]?.itemId)
  const stencil = items.find(item=>item.id===draft["weapon-stencil"]?.itemId)
  if(stencil && acceptsWeaponStencil(target,stencil)) next["weapon-stencil"]={itemId:stencil.id,quantity:1}
  if (previous && getWeaponProfile(previous)?.family === getWeaponProfile(target)?.family) {
    for (const slot of getWeaponAttachmentSlots(target, "weapon-1")) {
      const mod = items.find(item => item.id === draft[slot.id]?.itemId)
      if (mod && acceptsLoadoutItem("attachment", mod, target, slot.attachmentType)) next[slot.id] = { itemId: mod.id, quantity: 1 }
    }
  }
  return next
}

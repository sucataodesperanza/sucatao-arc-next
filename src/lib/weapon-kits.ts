import type { CatalogItem } from "@/lib/catalog"
import { acceptsLoadoutItem, getWeaponAttachmentSlots, getWeaponProfile, loadoutPurchaseIssue, type LoadoutDraft } from "@/lib/loadout"

export type SavedWeaponKit = { id: string; name: string; active: boolean; featured: boolean; position: number; draft: LoadoutDraft }

export function validateWeaponKit(input: unknown, items: CatalogItem[]) {
  const fail = (error: string) => ({ error, value: null })
  if (!input || typeof input !== "object") return fail("Kit inválido.")
  const data = input as Record<string, unknown>
  if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 80) return fail("Informe um nome com até 80 caracteres.")
  if (typeof data.active !== "boolean" || typeof data.featured !== "boolean" || !Number.isInteger(data.position) || Number(data.position) < 0 || Number(data.position) > 999) return fail("Status ou posição inválidos.")
  if (!data.draft || typeof data.draft !== "object" || Array.isArray(data.draft)) return fail("Escolha uma arma.")
  const draft = data.draft as LoadoutDraft
  const weapon = items.find(item => item.id === draft["weapon-1"]?.itemId)
  if (!weapon || !acceptsLoadoutItem("weapon", weapon)) return fail("Arma inválida ou inativa.")
  const mounts = getWeaponAttachmentSlots(weapon, "weapon-1")
  const clean: LoadoutDraft = {}
  if (Object.keys(draft).length > 5) return fail("Quantidade de componentes inválida.")
  for (const [key, entry] of Object.entries(draft)) {
    if (!entry || entry.quantity !== 1 || typeof entry.itemId !== "string") return fail("Cada componente deve ter uma unidade.")
    const item = items.find(item => item.id === entry.itemId)
    const mount = mounts.find(slot => slot.id === key)
    if (!item || (key !== "weapon-1" && (!mount || !acceptsLoadoutItem("attachment", item, weapon, mount.attachmentType)))) return fail("Acessório incompatível ou inativo.")
    clean[key] = { itemId: entry.itemId, quantity: 1 }
  }
  return { error: null, value: { name: data.name.trim(), active: data.active, featured: data.featured, position: Number(data.position), draft: clean } }
}

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

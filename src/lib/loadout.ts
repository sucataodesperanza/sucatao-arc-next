import arcData from "@/data/arc-data"
import attachmentData from "@/data/weapon-attachments.json"
import type { CatalogItem } from "@/lib/catalog"

type GameItem = CatalogItem & { nameEn?: string }
const gameItems = (arcData as unknown as { items: GameItem[] }).items
export const normalizeLoadoutText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
export type SlotKind = "backpack" | "shield" | "weapon" | "bag" | "quick" | "gadget" | "safe" | "attachment"
export type AttachmentType = "muzzle" | "shotgun-muzzle" | "underbarrel" | "stock" | "light-mag" | "medium-mag" | "shotgun-mag"
export type LoadoutSlot = { id: string; kind: SlotKind; label: string; weaponSlot?: string; attachmentType?: AttachmentType }
export type LoadoutEntry = { itemId: string; quantity: number }
export type LoadoutDraft = Record<string, LoadoutEntry>

export const loadoutSlots: LoadoutSlot[] = [
  { id: "backpack", kind: "backpack", label: "MK3 Sobrevivente" },
  { id: "shield", kind: "shield", label: "Escudo" },
  ...[1, 2].flatMap(n => [
    { id: `weapon-${n}`, kind: "weapon" as const, label: `Arma ${n}` },
  ]),
  ...Array.from({ length: 20 }, (_, i) => ({ id: `bag-${i}`, kind: "bag" as const, label: `Mochila: espaço ${i + 1}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `quick-${i}`, kind: "quick" as const, label: `Uso rápido: espaço ${i + 1}` })),
  { id: "gadget", kind: "gadget", label: "Espaço aperfeiçoado" },
  ...Array.from({ length: 3 }, (_, i) => ({ id: `safe-${i}`, kind: "safe" as const, label: `Bolso seguro: espaço ${i + 1}` })),
]

export function buildLoadoutItems(stock: CatalogItem[]): CatalogItem[] {
  const names = new Set(stock.map(item => normalizeLoadoutText(item.name)))
  const ids = new Set(stock.map(item => item.id))
  const combined = [...stock, ...gameItems.filter(item => !ids.has(item.id) && !names.has(normalizeLoadoutText(item.name)))].filter(item => item.type !== "expedition_vault_pack")
  const known = new Set(combined.map(item => getWeaponProfile(item)?.id).filter(Boolean))
  return [...combined, ...attachmentData.weapons.filter(item => !known.has(item.id)).map(item => ({ id: item.id, name: item.name, type: "Weapon", isWeapon: true, image: item.image, rarity: item.rarity ?? undefined, stackSize: 1 }))]
}

const canonicalName = (name: string) => normalizeLoadoutText(name).replace(/[_-]/g, " ").replace(/\s+/g, " ")
const baseName = (name: string) => canonicalName(name).replace(/\s+[ivx]+$/, "").replace(/ rifle$/, "")
export function getWeaponProfile(item: CatalogItem) {
  if (!isWeapon(item)) return undefined
  const meta = gameItems.find(meta => meta.id === item.id || canonicalName(meta.name) === canonicalName(item.name))
  const candidates = [item.name, item.id, meta?.nameEn].filter((name): name is string => !!name).map(canonicalName)
  candidates.push(...candidates.map(name => name.replace(/\si$/, "")))
  const exact = attachmentData.weapons.find(weapon => candidates.includes(canonicalName(weapon.id)) || candidates.includes(canonicalName(weapon.name)) || candidates.includes(canonicalName(weapon.name).replace(/ rifle$/, "")))
  if (exact) return exact
  // A bare tier V maps only to the base amplified variant, never to a specific upgrade path.
  if (/\sV$/i.test(item.name)) {
    const localBase = baseName(item.name)
    const alias = gameItems.find(meta => isWeapon(meta) && baseName(meta.name) === localBase)
    const english = alias?.nameEn ? baseName(alias.nameEn) : localBase
    return attachmentData.weapons.find(weapon => canonicalName(weapon.name) === `amplified ${english}`)
  }
  return undefined
}

export const attachmentLabels: Record<AttachmentType, string> = {
  muzzle: "Bocal", "shotgun-muzzle": "Bocal de escopeta", underbarrel: "Empunhadura", stock: "Coronha",
  "light-mag": "Carregador leve", "medium-mag": "Carregador médio", "shotgun-mag": "Carregador de escopeta",
}

export function loadoutItemSearchText(item: CatalogItem) {
  const profile = getWeaponProfile(item)
  if (!profile) return normalizeLoadoutText(item.name)
  const aliases = gameItems.filter(meta => isWeapon(meta) && meta.nameEn && baseName(meta.nameEn) === profile.family)
  const amplified = profile.name.startsWith("Amplified ")
  return normalizeLoadoutText([item.name, profile.name, amplified ? `${profile.family} V` : "", ...aliases.map(meta => `${baseName(meta.name)} ${amplified ? "V" : ""}`)].join(" "))
}

export function getWeaponAttachmentSlots(weapon: CatalogItem | undefined, weaponSlot: string): LoadoutSlot[] {
  if (!weapon || !isWeapon(weapon)) return []
  const profile = getWeaponProfile(weapon)
  return (profile?.slots ?? []).map(type => ({ id: `attachment-${weaponSlot.split("-")[1]}-${type}`, kind: "attachment", label: `${attachmentLabels[type as AttachmentType]} da arma ${weaponSlot.split("-")[1]}`, weaponSlot, attachmentType: type as AttachmentType }))
}

export function getLoadoutSlots(draft: LoadoutDraft, items: CatalogItem[]) {
  return [...loadoutSlots, ...loadoutSlots.filter(slot => slot.kind === "weapon").flatMap(slot => getWeaponAttachmentSlots(items.find(item => item.id === draft[slot.id]?.itemId), slot.id))]
}

export function restoreLoadoutDraft(saved: unknown, items: CatalogItem[]): LoadoutDraft {
  const draft: LoadoutDraft = {}
  const survivor = items.find(isSurvivor)
  if (survivor) draft.backpack = { itemId: survivor.id, quantity: 1 }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return draft
  const records = saved as Record<string, { itemId?: string; name?: string; quantity?: number }>
  function restore(slot: LoadoutSlot, entry: typeof records[string]) {
    if (!entry || typeof entry !== "object") return false
    const item = items.find(item => item.id === entry.itemId || (typeof entry.name === "string" && canonicalName(item.name) === canonicalName(entry.name)))
    const weapon = slot.weaponSlot ? items.find(item => item.id === draft[slot.weaponSlot!]?.itemId) : undefined
    if (!item || !acceptsLoadoutItem(slot.kind, item, weapon, slot.attachmentType)) return false
    draft[slot.id] = { itemId: item.id, quantity: Math.max(1, Math.min(slotQuantityLimit(slot.kind, item), Number.isFinite(entry.quantity) ? Math.floor(entry.quantity!) : 1)) }
    return true
  }
  for (const slot of loadoutSlots) restore(slot, records[slot.id])
  for (const slot of getLoadoutSlots(draft, items).filter(slot => slot.kind === "attachment")) {
    if (restore(slot, records[slot.id])) continue
    for (const [id, entry] of Object.entries(records)) {
      if (id.startsWith(`attachment-${slot.weaponSlot!.split("-")[1]}-`) && restore(slot, entry)) break
    }
  }
  return draft
}

function getModProfile(item: CatalogItem) {
  const meta = gameItems.find(meta => meta.id === item.id || canonicalName(meta.name) === canonicalName(item.name))
  const candidates = [item.id, item.name, meta?.nameEn].filter((name): name is string => !!name).map(canonicalName)
  return attachmentData.mods.find(mod => candidates.includes(canonicalName(mod.id)) || candidates.includes(canonicalName(mod.name)))
}

export function isSurvivor(item: CatalogItem) {
  return item.type === "Augment" && /survivor|sobrevivente/.test(normalizeLoadoutText(item.name)) && /mk\.?\s*3/.test(normalizeLoadoutText(item.name))
}

function isWeapon(item: CatalogItem) { return (item.isWeapon || item.type === "Weapon") && !item.isBlueprint && item.type !== "Blueprint" }
function isGadget(item: CatalogItem) {
  if (["Gadget", "Deployable"].includes(item.type ?? "")) return true
  if (item.type !== "Quick Use") return false
  // Older catalog entries group gadgets under Quick Use. Match their known game names.
  const known = gameItems.find(meta => meta.id === item.id || normalizeLoadoutText(meta.name) === normalizeLoadoutText(item.name))
  return !!known && /^(barricade_kit|binoculars|crash_mat|deadline|dockmasters_detector|door_blocker|explosive_mine|firecracker|fireworks_box|flame_spray|gas_mine|jolt_mine|noisemaker|photoelectric_cloak|powered_descender|pulse_mine|remote_raider_flare|snap_hook|surge_coil|zipline|.*_grenade_trap|.*_light_stick)$/.test(known.id)
}

export function attachmentFamily(item: CatalogItem) {
  const profile = getModProfile(item)
  if (profile?.slot) return profile.slot
  const name = normalizeLoadoutText(item.name)
  if (/grip|empunhadura/.test(name)) return "grip"
  if (/stock|coronha/.test(name)) return "stock"
  if (/magazine|carregador/.test(name)) return "magazine"
  if (/silenciador|suppressor|compensador|compensator|muzzle|cano|barrel|choke|choque|splitter/.test(name)) return "barrel"
  return name.replace(/\s+[ivx]+$/, "")
}

export function acceptsLoadoutItem(kind: SlotKind, item: CatalogItem, weapon?: CatalogItem, attachmentType?: AttachmentType) {
  if (kind === "bag") return true
  if (kind === "safe") return !item.isWeapon && item.type !== "Weapon" && item.type !== "Shield"
  if (item.isBlueprint || item.type === "Blueprint") return false
  switch (kind) {
    case "backpack": return isSurvivor(item)
    case "shield": return item.type === "Shield"
    case "weapon": return !!isWeapon(item)
    case "quick": return ["Quick Use", "Throwable", "Grenade", "Consumable"].includes(item.type ?? "") || isGadget(item)
    case "gadget": return isGadget(item)
    case "attachment": {
      if (item.type !== "Modification" || !weapon) return false
      const profile = getWeaponProfile(weapon)
      const mod = getModProfile(item)
      if (!profile || !mod?.slot || !profile.slots?.includes(mod.slot)) return false
      if (attachmentType && mod.slot !== attachmentType) return false
      // The mounting category determines compatibility, regardless of weapon tier.
      // MetaForge's partial family lists must not hide valid attachments.
      return true
    }
  }
}

export function slotQuantityLimit(kind: SlotKind, item: CatalogItem) {
  return ["bag", "quick", "safe"].includes(kind) ? Math.max(1, Math.floor(item.stackSize ?? 1)) : 1
}

export function equipLoadoutStacks(draft: LoadoutDraft, slot: LoadoutSlot, item: CatalogItem, quantity: number, slots: LoadoutSlot[]) {
  const stackable = ["bag", "quick", "safe"].includes(slot.kind)
  const requested = Math.max(1, Math.floor(quantity))
  const limit = slotQuantityLimit(slot.kind, item)
  if (!Number.isFinite(requested)) return { draft, error: "Informe uma quantidade válida." }
  if (!stackable) return { draft: { ...draft, [slot.id]: { itemId: item.id, quantity: 1 } }, error: null }
  // Editing a filled slot replaces that pile's quantity; other piles are preserved.
  const next = { ...draft }
  delete next[slot.id]
  const section = slots.filter(candidate => candidate.kind === slot.kind)
  const existing = section.filter(candidate => next[candidate.id]?.itemId === item.id)
  const empty = [slot, ...section.filter(candidate => candidate.id !== slot.id && !next[candidate.id])]
  const capacity = existing.reduce((sum, candidate) => sum + Math.max(0, limit - next[candidate.id].quantity), 0) + empty.length * limit
  if (requested > capacity) return { draft, error: `Cabem mais ${capacity} unidade(s) nesta seção. Libere espaços ou reduza a quantidade.` }
  let remaining = requested
  for (const candidate of [...existing, ...empty]) {
    if (!remaining) break
    const current = next[candidate.id]?.quantity ?? 0
    const added = Math.min(remaining, Math.max(0, limit - current))
    if (added) next[candidate.id] = { itemId: item.id, quantity: current + added }
    remaining -= added
  }
  return { draft: next, error: null }
}

export function summarizeLoadout(draft: LoadoutDraft, items: CatalogItem[]) {
  const totals = new Map<string, { item: CatalogItem; quantity: number }>()
  for (const entry of Object.values(draft)) {
    const item = items.find(item => item.id === entry.itemId)
    if (!item) continue
    const existing = totals.get(item.id)
    totals.set(item.id, { item, quantity: (existing?.quantity ?? 0) + entry.quantity })
  }
  return [...totals.values()]
}

export function loadoutPrice(value: number | undefined, quantity = 1) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * quantity * 100) / 100 : null
}

export function loadoutTotals(rows: { item: CatalogItem; quantity: number }[]) {
  return Object.fromEntries((["pricePoints", "priceCash"] as const).map(key => {
    let total = 0, missing = 0
    for (const { item, quantity } of rows) {
      const amount = loadoutPrice(item[key], quantity)
      if (amount === null) missing += quantity
      else total += amount
    }
    return [key, { total: Math.round(total * 100) / 100, missing }]
  })) as Record<"pricePoints" | "priceCash", { total: number; missing: number }>
}

export function loadoutPurchaseIssue(itemId: string, quantity: number, mode: "points" | "cash", stock: CatalogItem[], cart: { itemId: string; quantity: number }[]) {
  const item = stock.find(item => item.id === itemId)
  const price = mode === "points" ? item?.pricePoints : item?.priceCash
  if (!item || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "Indisponível nesta forma de pagamento"
  const inCart = cart.filter(row => row.itemId === itemId).reduce((sum, row) => sum + row.quantity, 0)
  return quantity + inCart > (item.quantity ?? 0) ? "Quantidade acima do estoque (incluindo seu carrinho)" : null
}

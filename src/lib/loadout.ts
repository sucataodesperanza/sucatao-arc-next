import arcData from "@/data/arc-data"
import type { CatalogItem } from "@/lib/catalog"

type GameItem = CatalogItem & { nameEn?: string }
const gameItems = (arcData as unknown as { items: GameItem[] }).items
export const normalizeLoadoutText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
export type SlotKind = "backpack" | "shield" | "weapon" | "bag" | "quick" | "gadget" | "safe" | "attachment"
export type LoadoutSlot = { id: string; kind: SlotKind; label: string; weaponSlot?: string }
export type LoadoutEntry = { itemId: string; quantity: number }
export type LoadoutDraft = Record<string, LoadoutEntry>

export const loadoutSlots: LoadoutSlot[] = [
  { id: "backpack", kind: "backpack", label: "MK3 Sobrevivente" },
  { id: "shield", kind: "shield", label: "Escudo" },
  ...[1, 2].flatMap(n => [
    { id: `weapon-${n}`, kind: "weapon" as const, label: `Arma ${n}` },
    ...[1, 2, 3].map(a => ({ id: `attachment-${n}-${a}`, kind: "attachment" as const, label: `Acessório ${a} da arma ${n}`, weaponSlot: `weapon-${n}` })),
  ]),
  ...Array.from({ length: 20 }, (_, i) => ({ id: `bag-${i}`, kind: "bag" as const, label: `Mochila: espaço ${i + 1}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `quick-${i}`, kind: "quick" as const, label: `Uso rápido: espaço ${i + 1}` })),
  { id: "gadget", kind: "gadget", label: "Espaço aperfeiçoado" },
  ...Array.from({ length: 3 }, (_, i) => ({ id: `safe-${i}`, kind: "safe" as const, label: `Bolso seguro: espaço ${i + 1}` })),
]

export function buildLoadoutItems(stock: CatalogItem[]): CatalogItem[] {
  const names = new Set(stock.map(item => normalizeLoadoutText(item.name)))
  return [...stock, ...gameItems.filter(item => !names.has(normalizeLoadoutText(item.name)))].filter(item => item.type !== "expedition_vault_pack")
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
  const name = normalizeLoadoutText(item.name)
  if (/grip|empunhadura/.test(name)) return "grip"
  if (/stock|coronha/.test(name)) return "stock"
  if (/magazine|carregador/.test(name)) return "magazine"
  if (/silenciador|suppressor|compensador|compensator|muzzle|cano|barrel|choke|choque|splitter/.test(name)) return "barrel"
  return name.replace(/\s+[ivx]+$/, "")
}

export function acceptsLoadoutItem(kind: SlotKind, item: CatalogItem, weapon?: CatalogItem) {
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
      const meta = gameItems.find(meta => normalizeLoadoutText(meta.name) === normalizeLoadoutText(weapon.name))
      const names = [weapon.name, meta?.nameEn].filter((name): name is string => !!name).map(name => normalizeLoadoutText(name).replace(/\s+[ivx]+$/, ""))
      const description = normalizeLoadoutText(item.description ?? "")
      const compatibility = description.split("compativel com:")[1]
      return !!compatibility && compatibility.split(/[,;.]/).some(name => names.includes(name.trim()))
    }
  }
}

export function slotQuantityLimit(kind: SlotKind, item: CatalogItem) {
  return ["bag", "quick", "safe"].includes(kind) ? Math.max(1, Math.floor(item.stackSize ?? 1)) : 1
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

export function loadoutPurchaseIssue(itemId: string, quantity: number, mode: "points" | "cash", stock: CatalogItem[], cart: { itemId: string; quantity: number }[]) {
  const item = stock.find(item => item.id === itemId)
  const price = mode === "points" ? item?.pricePoints : item?.priceCash
  if (!item || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "Indisponível nesta forma de pagamento"
  const inCart = cart.filter(row => row.itemId === itemId).reduce((sum, row) => sum + row.quantity, 0)
  return quantity + inCart > (item.quantity ?? 0) ? "Quantidade acima do estoque (incluindo seu carrinho)" : null
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  "Advanced Material": "Material Avançado",
  "Ammunition": "Munição",
  "Augment": "Aumento",
  "Basic Material": "Material Básico",
  "Blueprint": "Projeto",
  "Consumable": "Consumível",
  "Cosmetic": "Cosmético",
  "Deployable": "Implantável",
  "Gadget": "Gadget",
  "Key": "Chave",
  "Material": "Material",
  "Misc": "Diversos",
  "Modification": "Modificação",
  "Nature": "Natureza",
  "Quest Item": "Item de Missão",
  "Quick Use": "Uso Rápido",
  "Recyclable": "Reciclável",
  "Refined Material": "Material Refinado",
  "Shield": "Escudo",
  "Throwable": "Arremessável",
  "Topside Material": "Material de Superfície",
  "Trinket": "Bugiganga",
  "Weapon": "Arma",
}

export const RARITY_LABELS: Record<string, string> = {
  "Common": "Comum",
  "Uncommon": "Incomum",
  "Rare": "Raro",
  "Epic": "Épico",
  "Legendary": "Lendário",
}

export function getItemTypeLabel(type?: string | null) {
  if (!type) return "Item"
  return ITEM_TYPE_LABELS[type] ?? type
}

export function getRarityLabel(rarity?: string | null) {
  if (!rarity) return "—"
  return RARITY_LABELS[rarity] ?? rarity
}

export type CatalogItem = {
  id: string
  name: string
  description?: string
  type?: string
  rarity?: string
  value?: number
  quantity?: number
  weightKg?: number
  stackSize?: number
  isWeapon?: boolean
  isBlueprint?: boolean
  isCraftable?: boolean
  isRecyclable?: boolean
  image?: string
  featured?: boolean
  pricePoints?: number
  priceCash?: number
}

export type StockJoinRow = {
  value: number
  quantity: number
  featured: boolean
  price_points: number
  price_cash: number
  catalog_items: {
    id: string
    name: string
    description: string | null
    item_type: string | null
    rarity: string | null
    weight_kg: number | null
    stack_size: number | null
    icon_url: string | null
    is_weapon: boolean
    is_blueprint: boolean
    is_craftable: boolean
    is_recyclable: boolean
  }
}

// Tipo auxiliar para checagem de active (usado só no admin)
export type CatalogItemActive = { active: boolean }

export function mapStockItem(row: StockJoinRow): CatalogItem {
  const item = row.catalog_items
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    type: item.item_type ?? undefined,
    rarity: item.rarity ?? undefined,
    value: row.value,
    quantity: row.quantity,
    weightKg: item.weight_kg ?? undefined,
    stackSize: item.stack_size ?? undefined,
    isWeapon: item.is_weapon,
    isBlueprint: item.is_blueprint,
    isCraftable: item.is_craftable,
    isRecyclable: item.is_recyclable,
    image: item.icon_url ?? undefined,
    featured: row.featured,
    pricePoints: row.price_points > 0 ? row.price_points : undefined,
    priceCash:   row.price_cash   > 0 ? row.price_cash   : undefined,
  }
}

const METAFORGE_API = "https://metaforge.app/api/arc-raiders/items"

export type MetaForgeItem = {
  id: string
  name: string
  description: string | null
  item_type: string | null
  subcategory: string | null
  rarity: string | null
  value: number | null
  workbench: string | null
  icon: string | null
  stat_block?: { weight?: number; stackSize?: number } | null
}

type MetaForgeResponse = {
  data: MetaForgeItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean }
}

export type CatalogItemRow = {
  id: string
  name: string
  name_en: string
  description: string | null
  description_en: string | null
  item_type: string | null
  subcategory: string | null
  rarity: string | null
  value: number | null
  weight_kg: number | null
  stack_size: number | null
  workbench: string | null
  icon_url: string | null
  is_weapon: boolean
  is_blueprint: boolean
  is_craftable: boolean
  is_recyclable: boolean
  synced_at: string
}

export async function fetchMetaForgeItems(): Promise<CatalogItemRow[]> {
  const items: MetaForgeItem[] = []
  let page = 1

  while (true) {
    const response = await fetch(`${METAFORGE_API}?limit=100&page=${page}`, {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`MetaForge API retornou ${response.status} na página ${page}.`)
    }

    const json = (await response.json()) as MetaForgeResponse
    items.push(...json.data)

    if (!json.pagination?.hasNextPage) break
    page += 1
  }

  return items.map(mapMetaForgeItem)
}

export function mapMetaForgeItem(raw: MetaForgeItem): CatalogItemRow {
  return {
    id: raw.id,
    name: raw.name,
    name_en: raw.name,
    description: raw.description,
    description_en: raw.description,
    item_type: raw.item_type,
    subcategory: raw.subcategory,
    rarity: raw.rarity,
    value: raw.value,
    weight_kg: raw.stat_block?.weight ?? null,
    stack_size: raw.stat_block?.stackSize ?? null,
    workbench: raw.workbench,
    icon_url: raw.icon,
    is_weapon: raw.item_type === "Weapon",
    is_blueprint: raw.item_type === "Blueprint",
    is_craftable: !!raw.workbench,
    is_recyclable: raw.item_type === "Recyclable",
    synced_at: new Date().toISOString(),
  }
}

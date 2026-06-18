import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import arcData from "@/data/arc-data"

const MATERIAL_TYPES = [
  "Raw Material", "Topside Material", "Refined Material",
  "Material", "Basic Material", "Advanced Material", "Nature",
]

type ArcItem = {
  id: string; name: string; nameEn?: string; description?: string
  type?: string; rarity?: string; value?: number; weightKg?: number
  stackSize?: number; image?: string; isWeapon?: boolean
  isBlueprint?: boolean; isCraftable?: boolean; isRecyclable?: boolean
}

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const allItems = (arcData as unknown as { items: ArcItem[] }).items
  const materials = allItems.filter(i => MATERIAL_TYPES.includes(i.type ?? ""))

  const rows = materials.map(i => ({
    id:           i.id,
    name:         i.name,
    name_en:      i.nameEn ?? i.name,
    description:  i.description ?? null,
    description_en: i.description ?? null,
    item_type:    i.type ?? null,
    rarity:       i.rarity ?? null,
    value:        i.value ?? null,
    weight_kg:    i.weightKg ?? null,
    stack_size:   i.stackSize ?? null,
    workbench:    null,
    icon_url:     i.image ? `/${i.image}` : null,
    is_weapon:    false,
    is_blueprint: false,
    is_craftable: i.isCraftable ?? false,
    is_recyclable: i.isRecyclable ?? false,
    active:       true,
    synced_at:    new Date().toISOString(),
  }))

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("catalog_items")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false })

  if (error) {
    console.error("sync-materials error:", error)
    return NextResponse.json({ error: "Erro ao sincronizar materiais." }, { status: 500 })
  }

  return NextResponse.json({ synced: rows.length })
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMetaForgeItems, type CatalogItemRow } from "@/lib/metaforge"
import { translateToPtBr } from "@/lib/translate"
import arcData from "@/data/arc-data"

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

type ArcDataItem = { name: string; nameEn?: string; description?: string }
type ExistingRow = { id: string; name: string; description: string | null; name_en: string | null; description_en: string | null }

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  let rows: CatalogItemRow[]
  try {
    rows = await fetchMetaForgeItems()
  } catch (error) {
    console.error("api/admin/catalog/sync fetch error:", error)
    return NextResponse.json({ error: "API do MetaForge está fora do ar ou indisponível no momento." }, { status: 502 })
  }

  const supabase = createAdminClient()

  // Traduções curadas (PT) já existentes no arc-data, casadas pelo nome em inglês.
  const arcMeta = arcData as unknown as { items: ArcDataItem[] }
  const arcByName = new Map<string, { name: string; description: string | null }>()
  for (const item of arcMeta.items) {
    if (item.nameEn) {
      arcByName.set(normalizeText(item.nameEn), { name: item.name, description: item.description ?? null })
    }
  }

  // Cache de traduções já feitas em syncs anteriores.
  const { data: existingRows } = await supabase
    .from("catalog_items")
    .select("id, name, description, name_en, description_en")
    .returns<ExistingRow[]>()
  const existingById = new Map((existingRows ?? []).map(row => [row.id, row]))

  const pendingIndexes: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const arcMatch = arcByName.get(normalizeText(row.name_en))
    if (arcMatch) {
      row.name = arcMatch.name
      row.description = arcMatch.description ?? row.description_en
      continue
    }

    const existing = existingById.get(row.id)
    const alreadyTranslated = existing && existing.name_en === row.name_en && existing.name !== existing.name_en
    if (alreadyTranslated) {
      row.name = existing.name
      row.description = existing.description_en === row.description_en ? existing.description : row.description_en
      continue
    }

    pendingIndexes.push(i)
  }

  let translated = 0

  if (pendingIndexes.length > 0) {
    const texts: string[] = []
    pendingIndexes.forEach(i => {
      texts.push(rows[i].name_en)
      texts.push(rows[i].description_en ?? "")
    })

    const { texts: result, translatedCount } = await translateToPtBr(texts)
    pendingIndexes.forEach((i, j) => {
      rows[i].name = result[j * 2] || rows[i].name_en
      rows[i].description = result[j * 2 + 1] || rows[i].description_en
    })
    translated = translatedCount
  }

  const { error } = await supabase.from("catalog_items").upsert(rows, { onConflict: "id" })

  if (error) {
    console.error("api/admin/catalog/sync upsert error:", error)
    return NextResponse.json({ error: "Erro ao salvar catálogo no banco." }, { status: 500 })
  }

  return NextResponse.json({ synced: rows.length, total: rows.length, translated })
}

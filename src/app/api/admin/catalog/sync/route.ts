import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMetaForgeItems, type CatalogItemRow } from "@/lib/metaforge"
import { translateToPtBr } from "@/lib/translate"
import arcData from "@/data/arc-data"

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

type ArcDataItem = { id: string; name: string; nameEn?: string; description?: string }
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

  // MetaForge às vezes retorna itens com nomes ingleses diferentes que resultam
  // no mesmo nome em português. Deduplica por name_en antes da tradução (primeira passagem).
  const seenNamesEn = new Set<string>()
  rows = rows.filter(row => {
    const key = normalizeText(row.name_en)
    if (seenNamesEn.has(key)) return false
    seenNamesEn.add(key)
    return true
  })

  const supabase = createAdminClient()

  // Traduções curadas (PT) já existentes no arc-data, casadas pelo nome em inglês.
  const arcMeta = arcData as unknown as { items: ArcDataItem[] }
  const arcByName = new Map<string, { id: string; name: string; description: string | null }>()
  for (const item of arcMeta.items) {
    if (item.nameEn) {
      arcByName.set(normalizeText(item.nameEn), { id: item.id, name: item.name, description: item.description ?? null })
    }
  }

  // Cache de traduções e IDs já existentes no banco.
  const { data: existingRows } = await supabase
    .from("catalog_items")
    .select("id, name, description, name_en, description_en")
    .returns<ExistingRow[]>()
  const existingById = new Map((existingRows ?? []).map(row => [row.id, row]))

  // IDs que o stock_items referencia — não podemos trocar esses IDs nunca,
  // pois a FK ON DELETE CASCADE deletaria entradas de estoque.
  const { data: stockRows } = await supabase
    .from("stock_items")
    .select("catalog_item_id")
  const stockItemIds = new Set((stockRows ?? []).map(r => r.catalog_item_id as string))

  // Mapa nome-PT → id preferido.
  // Prioridade: 1) ID que está no stock_items  2) primeiro ID visto alfabeticamente
  const preferredIdByName = new Map<string, string>()
  for (const row of (existingRows ?? [])) {
    const key = normalizeText(row.name)
    const current = preferredIdByName.get(key)
    if (!current || stockItemIds.has(row.id)) {
      preferredIdByName.set(key, row.id)
    }
  }
  const existingIdByNameEn = new Map((existingRows ?? []).map(row => [normalizeText(row.name_en ?? ""), row.id]))

  const pendingIndexes: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const arcMatch = arcByName.get(normalizeText(row.name_en))
    if (arcMatch) {
      row.name = arcMatch.name
      row.description = arcMatch.description ?? row.description_en
      ;(row as typeof row & { arc_item_id?: string }).arc_item_id = arcMatch.id
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

  // Remapeia IDs: se o banco já tem uma linha com o mesmo nome PT ou name_en,
  // usa o ID existente (priorizando o que está no stock_items).
  // Garante que o upsert atinja SEMPRE a mesma linha e nunca crie duplicatas
  // nem quebre referências de FK do estoque.
  const remapped = rows.map(row => {
    const existingId =
      preferredIdByName.get(normalizeText(row.name)) ??
      existingIdByNameEn.get(normalizeText(row.name_en))
    if (existingId && existingId !== row.id) {
      return { ...row, id: existingId }
    }
    return row
  })

  // Deduplicação final por ID (após remapeamento dois itens podem ter o mesmo ID)
  const seenIds = new Set<string>()
  const deduped = remapped.filter(row => {
    if (seenIds.has(row.id)) return false
    seenIds.add(row.id)
    return true
  })

  const { error } = await supabase.from("catalog_items").upsert(deduped, { onConflict: "id" })

  if (error) {
    console.error("api/admin/catalog/sync upsert error:", error)
    return NextResponse.json({ error: "Erro ao salvar catálogo no banco." }, { status: 500 })
  }

  const duplicatesRemoved = rows.length - deduped.length
  return NextResponse.json({ synced: deduped.length, total: rows.length, translated, duplicatesRemoved })
}

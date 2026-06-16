import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMetaForgeArcs } from "@/lib/metaforge"
import { translateToPtBr } from "@/lib/translate"
import arcData from "@/data/arc-data"

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

type LocalBot = {
  id: string; name: string; type?: string; threat?: string; weakness?: string
  destroyXp?: number; lootXp?: number; drops?: string[]
}
type ExistingRow = {
  id: string; name: string; name_en: string
  description: string | null; description_en: string | null
  weakness: string | null; weakness_en: string | null
}

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  let arcs
  try {
    arcs = await fetchMetaForgeArcs()
  } catch (error) {
    console.error("api/admin/arcs/sync fetch error:", error)
    return NextResponse.json({ error: "API do MetaForge está fora do ar ou indisponível no momento." }, { status: 502 })
  }

  const supabase = createAdminClient()

  const localData = arcData as unknown as { bots: LocalBot[] }
  const localByName = new Map(localData.bots.map(b => [normalizeText(b.name), b]))

  const { data: existingRows } = await supabase
    .from("arcs")
    .select("id, name, name_en, description, description_en, weakness, weakness_en")
    .returns<ExistingRow[]>()
  const existingById = new Map((existingRows ?? []).map(row => [row.id, row]))

  const rows = arcs.map(arc => {
    const local = localByName.get(normalizeText(arc.name))
    return {
      id: arc.id,
      name: arc.name,
      name_en: arc.name,
      description: arc.description,
      description_en: arc.description,
      type: local?.type ?? null,
      threat: local?.threat ?? null,
      weakness: local?.weakness ?? null,
      weakness_en: local?.weakness ?? null,
      destroy_xp: local?.destroyXp ?? null,
      loot_xp: local?.lootXp ?? null,
      drops: local?.drops ?? null,
      icon_url: arc.icon,
      image_url: arc.image,
      guide_url: arc.guide_url,
      synced_at: new Date().toISOString(),
    }
  })

  const pendingIndexes: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const existing = existingById.get(row.id)
    const nameTranslated = !!existing && existing.name_en === row.name_en && existing.name !== existing.name_en
    const weaknessTranslated = !row.weakness_en || (!!existing && existing.weakness_en === row.weakness_en && existing.weakness !== existing.weakness_en)

    if (nameTranslated && weaknessTranslated && existing) {
      row.name = existing.name
      row.description = existing.description_en === row.description_en ? existing.description : row.description_en
      row.weakness = existing.weakness
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
      texts.push(rows[i].weakness_en ?? "")
    })

    const { texts: result, translatedCount } = await translateToPtBr(texts)
    pendingIndexes.forEach((i, j) => {
      rows[i].name = result[j * 3] || rows[i].name_en
      rows[i].description = result[j * 3 + 1] || rows[i].description_en
      rows[i].weakness = rows[i].weakness_en ? (result[j * 3 + 2] || rows[i].weakness_en) : null
    })
    translated = translatedCount
  }

  const { error } = await supabase.from("arcs").upsert(rows, { onConflict: "id" })

  if (error) {
    console.error("api/admin/arcs/sync upsert error:", error)
    return NextResponse.json({ error: "Erro ao salvar Arcpedia no banco." }, { status: 500 })
  }

  return NextResponse.json({ synced: rows.length, total: rows.length, translated })
}

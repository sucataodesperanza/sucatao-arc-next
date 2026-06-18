import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

const EMPTY = { obtained_from: [], recycled_into: [], recovered_into: [] }

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const name = decodeURIComponent(id)
  const supabase = await createClient()

  const FIELDS = "obtained_from, recycled_into, recovered_into"

  // 1. arc_item_id — preenchido pelo MetaForge sync quando há match com arc-data
  // 2. id direto — materiais inseridos via sync-materials usam arc-data ID
  // 3. name — fallback por nome PT para itens MetaForge sem arc_item_id ainda
  const [byArcId, byId, byName] = await Promise.all([
    supabase.from("catalog_items").select(FIELDS).eq("arc_item_id", name).eq("active", true).maybeSingle(),
    supabase.from("catalog_items").select(FIELDS).eq("id", name).eq("active", true).maybeSingle(),
    supabase.from("catalog_items").select(FIELDS).eq("name", name).eq("active", true).maybeSingle(),
  ])

  const data = byArcId.data ?? byId.data ?? byName.data

  if (!data) return NextResponse.json(EMPTY)

  return NextResponse.json({
    obtained_from:  data.obtained_from  ?? [],
    recycled_into:  data.recycled_into  ?? [],
    recovered_into: data.recovered_into ?? [],
  })
}

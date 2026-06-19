import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type ImageEntry = { name: string; icon_url: string | null; rarity: string | null; threat: string | null }

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const names: string[] = Array.isArray(body.names) ? body.names : []

  if (names.length === 0) return NextResponse.json({ images: [] })

  const supabase = await createClient()

  const [itemsRes, arcsRes] = await Promise.all([
    supabase.from("catalog_items").select("name, icon_url, rarity").in("name", names),
    supabase.from("arcs").select("name, icon_url, threat").in("name", names),
  ])

  type Entry = { icon_url: string | null; rarity: string | null; threat: string | null }
  const map = new Map<string, Entry>()
  for (const row of (itemsRes.data ?? [])) map.set(row.name, { icon_url: row.icon_url, rarity: row.rarity, threat: null })
  for (const row of (arcsRes.data ?? [])) map.set(row.name, { icon_url: row.icon_url, rarity: null, threat: row.threat })

  const images: ImageEntry[] = names.map(name => ({
    name,
    icon_url: map.get(name)?.icon_url ?? null,
    rarity:   map.get(name)?.rarity   ?? null,
    threat:   map.get(name)?.threat   ?? null,
  }))

  return NextResponse.json({ images })
}

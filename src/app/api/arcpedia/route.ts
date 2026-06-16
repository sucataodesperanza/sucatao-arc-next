import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mapArcRow, type ArcRow } from "@/lib/arcpedia"

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("arcs")
    .select("id, name, description, type, threat, weakness, destroy_xp, loot_xp, drops, icon_url, image_url")
    .eq("active", true)
    .returns<ArcRow[]>()

  if (error) {
    console.error("api/arcpedia error:", error)
    return NextResponse.json({ error: "Erro ao carregar a Arcpedia." }, { status: 500 })
  }

  return NextResponse.json({ arcs: (data ?? []).map(mapArcRow) })
}

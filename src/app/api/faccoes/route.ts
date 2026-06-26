import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type FactionAttributes = {
  combate:       number
  recursos:      number
  comercio:      number
  tecnologia:    number
  sobrevivencia: number
}

export type Faction = {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  color: string
  icon_url: string | null
  bonuses: string[]
  attributes: FactionAttributes
  active: boolean
  position: number
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("factions")
    .select("id, slug, name, tagline, description, color, icon_url, bonuses, attributes, active, position")
    .eq("active", true)
    .order("position", { ascending: true })

  if (error) return NextResponse.json({ factions: [] })
  return NextResponse.json({ factions: data ?? [] })
}

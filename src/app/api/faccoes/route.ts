import { NextResponse } from "next/server"
import { getCachedFactions } from "@/lib/cache"

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
  const factions = await getCachedFactions()
  return NextResponse.json({ factions })
}

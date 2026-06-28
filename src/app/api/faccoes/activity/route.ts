import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type FactionActivity = {
  id: string
  text: string
  created_at: string
  factions: {
    slug: string
    color: string
    name: string
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("faction_activity")
    .select("id, text, created_at, factions(slug, color, name)")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<FactionActivity[]>()

  return NextResponse.json({ activity: data ?? [] })
}

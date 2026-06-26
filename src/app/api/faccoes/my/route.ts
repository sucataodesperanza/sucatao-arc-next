import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type UserFaction = {
  id: string
  joined_at: string
  factions: {
    id: string
    slug: string
    name: string
    color: string
    icon_url: string | null
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ faction: null })

  const { data } = await supabase
    .from("user_factions")
    .select("id, joined_at, factions(id, slug, name, color, icon_url)")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({ faction: data ?? null })
}

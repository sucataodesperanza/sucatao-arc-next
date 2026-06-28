import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type Streamer = {
  id: string; name: string; platform: string; channel_url: string | null
  avatar_url: string | null; viewers_text: string; verified: boolean; position: number; color: string
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("streamers")
    .select("id,name,platform,channel_url,avatar_url,viewers_text,verified,position,color")
    .eq("active", true)
    .order("position")
  return NextResponse.json({ streamers: data ?? [] })
}

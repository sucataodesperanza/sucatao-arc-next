import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type MapRecord = {
  id: string
  name: string
  label: string
  description: string
  image_url: string | null
  status: string
  index: number
}

export type MapMarker = {
  id: string
  map_id: string
  type: string
  x: number
  y: number
  title: string
  note: string
}

export async function GET() {
  const supabase = await createClient()

  const [mapsRes, markersRes] = await Promise.all([
    supabase.from("maps").select("id, name, label, description, image_url, status, index").order("index", { ascending: true }),
    supabase.from("map_markers").select("id, map_id, type, x, y, title, note").eq("active", true),
  ])

  return NextResponse.json({
    maps:    mapsRes.data    ?? [],
    markers: markersRes.data ?? [],
  })
}

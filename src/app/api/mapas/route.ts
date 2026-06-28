import { NextResponse } from "next/server"
import { getCachedMaps } from "@/lib/cache"

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
  const data = await getCachedMaps()
  return NextResponse.json(data)
}

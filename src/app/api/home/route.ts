import { NextResponse } from "next/server"
import { getCachedHomeContent } from "@/lib/cache"

export type HomeNews = {
  id: string; date_label: string; title: string; text: string
  image_url: string | null; href: string | null; icon_name: string; position: number
}

export type HomeSlide = {
  id: string; tag: string; icon_name: string; image_url: string | null
  title: string; text: string; cta_label: string; cta_href: string; position: number
}

export async function GET() {
  const data = await getCachedHomeContent()
  return NextResponse.json(data)
}

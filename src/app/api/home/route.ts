import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type HomeNews = {
  id: string; date_label: string; title: string; text: string
  image_url: string | null; href: string | null; icon_name: string; position: number
}

export type HomeSlide = {
  id: string; tag: string; icon_name: string; image_url: string | null
  title: string; text: string; cta_label: string; cta_href: string; position: number
}

export async function GET() {
  const supabase = await createClient()
  const [newsRes, slidesRes] = await Promise.all([
    supabase.from("home_news").select("id,date_label,title,text,image_url,href,icon_name,position").eq("active", true).order("position"),
    supabase.from("home_slides").select("id,tag,icon_name,image_url,title,text,cta_label,cta_href,position").eq("active", true).order("position"),
  ])
  return NextResponse.json({
    news:   newsRes.data   ?? [],
    slides: slidesRes.data ?? [],
  })
}

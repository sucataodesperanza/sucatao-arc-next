import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type RewardItem = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  stock: number
  featured: boolean
  expires_at: string | null
}

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reward_items")
    .select("id, name, description, image_url, price, stock, featured, expires_at")
    .eq("active", true)
    .eq("featured", true)
    .order("price", { ascending: false })
    .returns<RewardItem[]>()

  if (error) {
    console.error("api/loja/weekly error:", error)
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({ items: data ?? [] })
}

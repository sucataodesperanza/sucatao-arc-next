import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type Trade = {
  id: string
  offer_points: number
  want_item_name: string
  want_item_qty: number
  want_item_icon: string | null
  want_item_rarity: string | null
  status: string
  expires_at: string | null
  created_at: string
}

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("trades")
    .select("id, offer_points, want_item_name, want_item_qty, want_item_icon, want_item_rarity, status, expires_at, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .returns<Trade[]>()

  if (error) {
    console.error("api/trades error:", error)
    return NextResponse.json({ trades: [] })
  }

  return NextResponse.json({ trades: data ?? [] })
}

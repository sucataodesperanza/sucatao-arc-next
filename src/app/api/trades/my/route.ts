import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type MyTrade = {
  id: string
  status: string
  game_id: string | null
  created_at: string
  scheduled_at: string | null  // novo campo de agendamento livre
  trades: {
    id: string
    offer_points: number
    want_item_name: string
    want_item_qty: number
    want_item_icon: string | null
    want_item_rarity: string | null
  }
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ trades: [] })

  const { data, error } = await supabase
    .from("trade_acceptances")
    .select("id, status, game_id, created_at, scheduled_at, trades(id, offer_points, want_item_name, want_item_qty, want_item_icon, want_item_rarity)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .returns<MyTrade[]>()

  if (error) {
    console.error("api/trades/my error:", error)
    return NextResponse.json({ trades: [] })
  }

  return NextResponse.json({ trades: data ?? [] })
}

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { filterAvailableTrades } from "@/lib/trade-list"

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
  const db = createAdminClient()
  try {
    const trades: Trade[] = []
    const accepted: { trade_id: string; status: string }[] = []
    for (let page = 0; ; page++) {
      const result = await db.from("trades").select("id,offer_points,want_item_name,want_item_qty,want_item_icon,want_item_rarity,status,expires_at,created_at")
        .eq("status", "active").order("created_at", { ascending: false }).order("id").range(page * 500, page * 500 + 499)
      if (result.error) throw result.error
      trades.push(...(result.data ?? []))
      if ((result.data?.length ?? 0) < 500) break
    }
    for (let page = 0; ; page++) {
      const result = await db.from("trade_acceptances").select("trade_id,status,id").neq("status", "cancelled")
        .order("id").range(page * 500, page * 500 + 499)
      if (result.error) throw result.error
      accepted.push(...(result.data ?? []))
      if ((result.data?.length ?? 0) < 500) break
    }
    return NextResponse.json({ trades: filterAvailableTrades(trades, accepted) }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar as trades disponíveis." }, { status: 503 })
  }
}

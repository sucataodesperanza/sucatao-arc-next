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
  const trades = await getCachedActiveContracts()
  return NextResponse.json({ trades })
}

// Import em baixo para não poluir o escopo dos tipos
import { getCachedActiveContracts } from "@/lib/cache"

import { NextResponse } from "next/server"
import { readTradeAvailability } from "@/lib/trade-scheduling-store"
export type { TradeSlot } from "@/lib/trade-scheduling"

export async function GET() {
  try {
    return NextResponse.json({ slots: await readTradeAvailability() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os horários." }, { status: 503 })
  }
}

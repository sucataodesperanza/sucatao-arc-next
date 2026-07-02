import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET /api/expeditions/active — retorna a expedição ativa no momento (pública)
export async function GET() {
  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { data } = await admin
    .from("expeditions")
    .select("id, name, description, ends_at, slots_per_pack, item_name, item_image_url, price_points, price_cash")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ expedition: data ?? null })
}

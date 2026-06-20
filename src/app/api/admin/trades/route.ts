import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Erro ao carregar trades." }, { status: 500 })
  return NextResponse.json({ trades: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))

  const { offer_points, want_item_name, want_item_qty, want_item_icon, want_item_rarity, status, expires_at } = body

  if (!want_item_name || typeof offer_points !== "number") {
    return NextResponse.json({ error: "Campos obrigatórios: offer_points, want_item_name." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("trades")
    .insert({
      offer_points,
      want_item_name,
      want_item_qty: want_item_qty ?? 1,
      want_item_icon: want_item_icon ?? null,
      want_item_rarity: want_item_rarity ?? null,
      status: status ?? "active",
      expires_at: expires_at ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Erro ao criar trade." }, { status: 500 })
  return NextResponse.json({ trade: data })
}

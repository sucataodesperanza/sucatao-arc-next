import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("reward_items")
    .select("*")
    .order("created_at", { ascending: false })

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const { name, description, image_url, price, stock, featured, expires_at } = body

  if (!name) return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("reward_items")
    .insert({
      name,
      description: description ?? null,
      image_url:   image_url   ?? null,
      price:       price       ?? 0,
      stock:       stock       ?? 0,
      featured:    featured    ?? false,
      expires_at:  expires_at  ?? null,
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Erro ao criar item." }, { status: 500 })
  return NextResponse.json({ item: data })
}

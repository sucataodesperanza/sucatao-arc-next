import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_TABLES = ["home_news", "home_slides"]

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const { table, id } = await params
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const { error } = await admin.from(table as any).update(body).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ table: string; id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const { table, id } = await params
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from(table as any).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

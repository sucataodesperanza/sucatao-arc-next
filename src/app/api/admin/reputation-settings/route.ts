import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("reputation_settings")
    .select("source, points, label")
    .order("source")

  return NextResponse.json({ settings: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await req.json().catch(() => ({}))
  const { source, points } = body as { source?: string; points?: number }

  if (!source || typeof points !== "number") {
    return NextResponse.json({ error: "source e points são obrigatórios." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("reputation_settings")
    .update({ points, updated_at: new Date().toISOString() })
    .eq("source", source)

  if (error) return NextResponse.json({ error: "Erro ao salvar configuração." }, { status: 500 })

  return NextResponse.json({ ok: true })
}

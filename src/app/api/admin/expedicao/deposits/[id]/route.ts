import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_STATUS = ["scheduled", "in_storage", "returned", "cancelled"] as const

// PATCH /api/admin/expedicao/deposits/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { id }    = await params
  const body      = await request.json().catch(() => ({}))
  const { status, admin_notes } = body

  if (status && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status)      patch.status      = status
  if (admin_notes !== undefined) patch.admin_notes = admin_notes

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("expedition_vault_deposits")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

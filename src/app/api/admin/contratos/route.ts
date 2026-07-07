import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  // Admin bypassa RLS para ver contratos inativos também
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false })
  return NextResponse.json({ contracts: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const body = await request.json().catch(() => ({}))
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("contracts")
    .insert({
      contract_type:      body.contract_type      ?? "comum",
      mission_type:       body.mission_type       ?? "diario",
      price_points:       body.price_points       ?? 0,
      price_real:         body.price_real         ?? 0,
      type:               body.type               ?? "Principal",
      tier:               body.tier               ?? "Básico",
      title:              body.title              ?? "",
      description:        body.description        ?? "",
      story:              body.story              ?? "",
      image_url:          body.image_url          ?? null,
      objective:          body.objective          ?? "",
      total:              body.total              ?? 1,
      sucatas:            body.sucatas            ?? 0,
      xp:                 body.xp                ?? 0,
      rep:                body.rep               ?? null,
      location:           body.location           ?? "",
      estimated_time:     body.estimated_time     ?? "",
      best_time_of_day:   body.best_time_of_day   ?? "",
      climate:            body.climate            ?? "",
      environmental_risk: body.environmental_risk ?? "Médio",
      expires_at:         body.expires_at         ?? null,
      variant:            body.variant            ?? null,
      rewards:            body.rewards            ?? [],
      objectives:         body.objectives         ?? [],
      enemies:            body.enemies            ?? [],
      success_rate:       body.success_rate       ?? 50,
      active:             body.active             ?? true,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.id })
}

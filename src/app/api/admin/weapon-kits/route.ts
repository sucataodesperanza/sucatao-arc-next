import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { readWeaponKitCatalog, readWeaponKits, WEAPON_KIT_ENTITY } from "@/lib/weapon-kit-store"
import { validateWeaponKit } from "@/lib/weapon-kits"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    const [kits, items] = await Promise.all([readWeaponKits(), readWeaponKitCatalog()])
    return NextResponse.json({ kits, items }, { headers: { "Cache-Control": "no-store" } })
  } catch { return NextResponse.json({ error: "Não foi possível carregar os kits e componentes." }, { status: 500 }) }
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  try {
    const body = await request.json()
    const parsed = validateWeaponKit(body, await readWeaponKitCatalog())
    if (!parsed.value) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const admin = createAdminClient()
    if (body.id !== undefined && (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.id))) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 })
    const result = body.id
      ? await admin.from("app_entities").update({ payload: parsed.value, updated_at: new Date().toISOString() }).eq("id", body.id).eq("entity_type", WEAPON_KIT_ENTITY).select("id").single()
      : await admin.from("app_entities").insert({ entity_type: WEAPON_KIT_ENTITY, payload: parsed.value }).select("id").single()
    if (result.error) return NextResponse.json({ error: "Não foi possível salvar o kit." }, { status: 400 })
    return NextResponse.json({ id: result.data.id })
  } catch { return NextResponse.json({ error: "Não foi possível salvar. Confira os dados e tente novamente." }, { status: 400 }) }
}

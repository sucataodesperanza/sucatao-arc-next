import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ vault: null })

  const admin = createAdminClient()
  const now   = new Date().toISOString()

  const { data: expedition } = await admin
    .from("expeditions")
    .select("id, name, ends_at, slots_per_pack")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!expedition) return NextResponse.json({ vault: null })

  const { data: pack } = await admin
    .from("expedition_vault_packs")
    .select("packs_count, total_slots")
    .eq("user_id", user.id)
    .eq("expedition_id", expedition.id)
    .maybeSingle()

  if (!pack) return NextResponse.json({ vault: null })

  return NextResponse.json({
    vault: {
      expedition: {
        id: expedition.id,
        name: expedition.name,
        ends_at: expedition.ends_at,
        slots_per_pack: expedition.slots_per_pack,
      },
      packs_count: pack.packs_count,
      total_slots:  pack.total_slots,
    },
  })
}

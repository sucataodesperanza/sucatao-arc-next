import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

function buildCode(name: string, userId: string): string {
  const slug = (name ?? "USER")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "USER"
  const suffix = userId.replace(/-/g, "").slice(-6).toUpperCase()
  return `${slug}-${suffix}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Busca código existente
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .single()

  if (existing?.code) return NextResponse.json({ code: existing.code })

  // Gera e salva
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  const code = buildCode(profile?.name ?? "", user.id)

  const admin = createAdminClient()
  const { error } = await admin.from("referral_codes").insert({ user_id: user.id, code })
  if (error) return NextResponse.json({ error: "Erro ao gerar código." }, { status: 500 })

  return NextResponse.json({ code })
}

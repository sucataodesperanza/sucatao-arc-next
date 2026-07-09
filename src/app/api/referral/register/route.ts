import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  // Lê o código do cookie httpOnly (enviado automaticamente pelo browser)
  const cookieStore = await cookies()
  const cookieCode = cookieStore.get("ref_code")?.value ?? ""
  const bodyCode   = await req.json().catch(() => ({})).then((b: any) => b?.code ?? "")
  const code = (cookieCode || bodyCode).trim().toUpperCase()

  if (!code) return NextResponse.json({ ok: false, reason: "no_code" })

  const admin = createAdminClient()

  // Resolve referrer pelo código
  const { data: refCode } = await admin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .single()

  const res = NextResponse.json({ ok: false, reason: "invalid_code" })

  if (!refCode) {
    // Apaga o cookie inválido
    res.cookies.set("ref_code", "", { maxAge: 0, path: "/" })
    return res
  }

  // Impede autoindicação
  if (refCode.user_id === user.id) {
    const r = NextResponse.json({ ok: false, reason: "self_referral" })
    r.cookies.set("ref_code", "", { maxAge: 0, path: "/" })
    return r
  }

  // Verifica se já tem indicador
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle()

  if (existing) {
    const r = NextResponse.json({ ok: false, reason: "already_referred" })
    r.cookies.set("ref_code", "", { maxAge: 0, path: "/" })
    return r
  }

  const { error } = await admin.from("referrals").insert({
    referrer_id:   refCode.user_id,
    referred_id:   user.id,
    code_used:     code,
    status:        "registered",
    registered_at: new Date().toISOString(),
    origin:        "link",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ok = NextResponse.json({ ok: true })
  ok.cookies.set("ref_code", "", { maxAge: 0, path: "/" })
  return ok
}

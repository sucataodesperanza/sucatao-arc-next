import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Faça login para se inscrever." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { nickname, platform, channel_url, message } = body

  if (!nickname?.trim()) return NextResponse.json({ error: "Nickname é obrigatório." }, { status: 400 })
  if (!platform)         return NextResponse.json({ error: "Plataforma é obrigatória." }, { status: 400 })
  if (!channel_url?.trim()) return NextResponse.json({ error: "URL do canal é obrigatória." }, { status: 400 })

  const admin = createAdminClient()

  // Verifica se já tem inscrição ativa
  const { data: existing } = await admin
    .from("streamer_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .single()

  if (existing) {
    const msg = existing.status === "approved"
      ? "Você já é um streamer parceiro!"
      : "Você já tem uma inscrição pendente de análise."
    return NextResponse.json({ error: msg }, { status: 409 })
  }

  const { error } = await admin.from("streamer_applications").insert({
    user_id: user.id, nickname: nickname.trim(), platform,
    channel_url: channel_url.trim(), message: message?.trim() ?? "",
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

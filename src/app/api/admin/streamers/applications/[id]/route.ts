import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action: "approve" | "reject" = body.action

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action deve ser approve ou reject" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: app } = await admin
    .from("streamer_applications")
    .select("*")
    .eq("id", id)
    .single()

  if (!app) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 })

  await admin.from("streamer_applications").update({
    status: action === "approve" ? "approved" : "rejected",
    reviewed_at: new Date().toISOString(),
  }).eq("id", id)

  // Se aprovado: cria o streamer automaticamente
  if (action === "approve") {
    await admin.from("streamers").insert({
      name:         app.nickname,
      username:     app.nickname.toLowerCase().replace(/\s+/g, ""),
      platform:     app.platform,
      channel_url:  app.channel_url,
      viewers_text: "",
      verified:     false,
      active:       true,
      position:     99,
      color:        "#5fa8ff",
    }).select("id").single()

    // E-mail de aprovação — busca de auth.users via admin
    const { data: authUser } = await admin.auth.admin.getUserById(app.user_id)
    const email = authUser?.user?.email
    if (email && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "noreply@sucatao.com.br",
        to:   email,
        subject: "🎉 Você foi aprovado no Programa de Streamers do Sucatão!",
        html: `
          <h2>Parabéns, ${app.nickname}!</h2>
          <p>Sua inscrição no <strong>Programa de Streamers do Sucatão</strong> foi aprovada.</p>
          <p>Você já aparece na nossa página de streamers. Bem-vindo ao time!</p>
          <p>Canal: <a href="${app.channel_url}">${app.channel_url}</a></p>
          <br/>
          <p>Equipe Sucatão</p>
        `,
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}

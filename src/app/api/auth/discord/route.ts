import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const clientId = process.env.DISCORD_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: "Discord não configurado." }, { status: 503 })

  const redirectUri = new URL("/api/auth/discord/callback", request.url).toString()
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "identify",
  })

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`)
}

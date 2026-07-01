import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const returnTo = request.cookies.get("discord_return_to")?.value ?? "/perfil"
  function buildRedirect(param: string) {
    const url = new URL(returnTo, request.url)
    url.searchParams.set("discord", param)
    const res = NextResponse.redirect(url)
    res.cookies.delete("discord_return_to")
    return res
  }

  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const code = request.nextUrl.searchParams.get("code")
  const error = request.nextUrl.searchParams.get("error")

  if (error || !code) return buildRedirect("cancelled")

  const clientId     = process.env.DISCORD_CLIENT_ID!
  const clientSecret = process.env.DISCORD_CLIENT_SECRET!
  const redirectUri  = new URL("/api/auth/discord/callback", request.url).toString()

  // Troca o code por access token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
    }),
  })

  if (!tokenRes.ok) return buildRedirect("error")

  const { access_token } = await tokenRes.json()

  // Busca dados do usuário Discord
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userRes.ok) return buildRedirect("error")

  const discordUser = await userRes.json()
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : null

  const { error: dbError } = await supabase
    .from("profiles")
    .update({
      discord_id:       discordUser.id,
      discord_username: discordUser.username,
      discord_avatar:   avatarUrl,
    })
    .eq("id", user.id)

  if (dbError) return buildRedirect("error")

  return buildRedirect("connected")
}

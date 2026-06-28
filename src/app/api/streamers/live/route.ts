import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Extrai o username da URL da Twitch
// https://twitch.tv/patife → patife
// https://www.twitch.tv/patife → patife
function twitchUsername(url: string | null): string | null {
  if (!url) return null
  try {
    const path = new URL(url).pathname.replace(/^\//, "").split("/")[0]
    return path || null
  } catch {
    return null
  }
}

async function getTwitchToken(): Promise<string | null> {
  const id     = process.env.TWITCH_CLIENT_ID
  const secret = process.env.TWITCH_CLIENT_SECRET
  if (!id || !secret) return null

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`,
    { method: "POST", next: { revalidate: 3600 } } // token dura ~60 dias, cache por 1h
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) return NextResponse.json({ live: {} })

  const supabase = await createClient()
  const { data: streamers } = await supabase
    .from("streamers")
    .select("id, channel_url, platform")
    .eq("active", true)
    .eq("platform", "twitch")

  const twitchStreamers = (streamers ?? [])
    .map(s => ({ id: s.id, username: twitchUsername(s.channel_url) }))
    .filter(s => s.username)

  if (!twitchStreamers.length) return NextResponse.json({ live: {} })

  const token = await getTwitchToken()
  if (!token) return NextResponse.json({ live: {} })

  // Busca streams ao vivo — até 100 por chamada
  const params = twitchStreamers.map(s => `user_login=${s.username}`).join("&")
  const streamsRes = await fetch(`https://api.twitch.tv/helix/streams?${params}`, {
    headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` },
    next: { revalidate: 60 }, // cache de 1 minuto no servidor
  })

  if (!streamsRes.ok) return NextResponse.json({ live: {} })
  const streamsData = await streamsRes.json()

  // Mapeia username → { viewer_count, is_live, title, thumbnail }
  const liveByUsername: Record<string, { viewer_count: number; title: string; thumbnail: string }> = {}
  for (const stream of streamsData.data ?? []) {
    liveByUsername[stream.user_login.toLowerCase()] = {
      viewer_count: stream.viewer_count,
      title:        stream.title,
      thumbnail:    stream.thumbnail_url.replace("{width}", "320").replace("{height}", "180"),
    }
  }

  // Converte para mapa por id do streamer
  const live: Record<string, { viewer_count: number; is_live: boolean; title?: string; thumbnail?: string }> = {}
  for (const s of twitchStreamers) {
    const data = liveByUsername[s.username!.toLowerCase()]
    live[s.id] = data
      ? { viewer_count: data.viewer_count, is_live: true, title: data.title, thumbnail: data.thumbnail }
      : { viewer_count: 0, is_live: false }
  }

  return NextResponse.json({ live })
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const { error } = await supabase
    .from("profiles")
    .update({ discord_id: null, discord_username: null, discord_avatar: null })
    .eq("id", user.id)

  if (error) return NextResponse.json({ error: "Erro ao desconectar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

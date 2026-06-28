import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type ContractStats = {
  completed: number
  failed: number
  expired: number
  total: number
  success_rate: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ completed: 0, failed: 0, expired: 0, total: 0, success_rate: 0 })

  const { data } = await supabase
    .from("user_contracts")
    .select("status")
    .eq("user_id", user.id)

  const rows = data ?? []
  const completed = rows.filter(r => r.status === "completed").length
  const failed    = rows.filter(r => r.status === "failed").length
  const expired   = rows.filter(r => r.status === "expired").length
  const total     = rows.length
  const decisive  = completed + failed
  const success_rate = decisive > 0 ? Math.round((completed / decisive) * 100) : 0

  return NextResponse.json({ completed, failed, expired, total, success_rate } satisfies ContractStats)
}

import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("q") ?? ""
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const limit  = 30
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from("profiles")
    .select("id, username, game_id, avatar_url, reputation, points, total_orders, total_spent, created_at, is_admin", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (search.trim()) {
    query = query.or(`username.ilike.%${search}%,game_id.ilike.%${search}%`)
  }

  const { data, count } = await query

  return NextResponse.json({ users: data ?? [], total: count ?? 0, page, limit })
}

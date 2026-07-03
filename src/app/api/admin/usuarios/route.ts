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

  const [{ data, count }, authRes] = await Promise.all([
    query,
    supabase.auth.admin.listUsers({ perPage: 1000 }),
  ])

  // Mapa de display_name vindo do metadata do auth (ex: nome do Google/Discord)
  const nameMap: Record<string, string | null> = {}
  for (const u of authRes.data?.users ?? []) {
    const meta = u.user_metadata ?? {}
    nameMap[u.id] = meta.name ?? meta.full_name ?? meta.preferred_username ?? null
  }

  const users = (data ?? []).map(p => ({
    ...p,
    display_name: nameMap[p.id] ?? null,
  }))

  // Se houver busca por nome, filtra também pelo display_name
  const filtered = search.trim()
    ? users.filter(u =>
        (u.display_name?.toLowerCase().includes(search.toLowerCase())) ||
        (u.username?.toLowerCase().includes(search.toLowerCase())) ||
        (u.game_id?.toLowerCase().includes(search.toLowerCase()))
      )
    : users

  return NextResponse.json({ users: filtered, total: count ?? 0, page, limit })
}

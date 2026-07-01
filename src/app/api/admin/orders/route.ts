import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const PENDING_PAYMENT_TIMEOUT_MS = 60 * 60 * 1000

async function cancelExpiredPendingOrders(supabase: ReturnType<typeof createAdminClient>) {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TIMEOUT_MS).toISOString()

  const { data: expired } = await supabase
    .from("orders")
    .select("id, items")
    .eq("status", "pending")
    .eq("payment_status", "pending")
    .lt("created_at", cutoff)

  if (!expired?.length) return

  await supabase
    .from("orders")
    .update({ status: "cancelled", payment_status: "failed", cancelled_at: new Date().toISOString() })
    .in("id", expired.map(o => o.id))

  for (const order of expired) {
    const items = (order.items ?? []) as Array<{ itemId?: string; quantity?: number }>
    const stockItems = items.filter(i => i.itemId && i.quantity).map(i => ({ itemId: i.itemId, quantity: i.quantity }))
    if (stockItems.length > 0) {
      await supabase.rpc("restore_stock", { p_items: stockItems })
    }
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  const { searchParams } = request.nextUrl
  const q = searchParams.get("q")?.trim().replace(/[,()]/g, "") ?? ""
  const status = searchParams.get("status") ?? "all"
  const paymentStatus = searchParams.get("paymentStatus") ?? "all"
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20") || 20))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = createAdminClient()

  await cancelExpiredPendingOrders(supabase)

  let query = supabase
    .from("orders")
    .select("id, user_id, total, status, payment_method, payment_status, items, created_at, paid_at, cancelled_at, discord_channel_id, delivered_at", { count: "exact" })
    .order("created_at", { ascending: false })

  if (status !== "all") query = query.eq("status", status)
  if (paymentStatus !== "all") query = query.eq("payment_status", paymentStatus)

  if (q) {
    const orFilters = [`id::text.ilike.%${q}%`, `payment_reference.ilike.%${q}%`, `items::text.ilike.%${q}%`]

    const { data: matchedProfiles } = await supabase.from("profiles").select("id").ilike("name", `%${q}%`)
    if (matchedProfiles?.length) {
      orFilters.push(`user_id.in.(${matchedProfiles.map(p => p.id).join(",")})`)
    }

    query = query.or(orFilters.join(","))
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    console.error("api/admin/orders GET error:", error)
    return NextResponse.json({ error: "Erro ao carregar pedidos." }, { status: 500 })
  }

  const orders = data ?? []

  const userIds = [...new Set(orders.map(o => o.user_id).filter((id): id is string => Boolean(id)))]
  const customers = new Map<string, { name: string | null; email: string | null; game_id: string | null }>()

  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, name, nick, game_id").in("id", userIds)
    for (const p of profiles ?? []) customers.set(p.id, { name: p.name ?? p.nick ?? null, email: null, game_id: p.game_id ?? null })

    await Promise.all(userIds.map(async id => {
      const { data: userData } = await supabase.auth.admin.getUserById(id)
      const authUser = userData?.user
      const existing = customers.get(id) ?? { name: null, email: null, game_id: null }
      const metadataName = typeof authUser?.user_metadata?.name === "string" ? authUser.user_metadata.name : null
      const emailPrefix = authUser?.email?.split("@")[0] ?? null
      customers.set(id, {
        ...existing,
        name: existing.name ?? metadataName ?? emailPrefix,
        email: authUser?.email ?? null,
      })
    }))
  }

  const items = orders.map(order => {
    const customer = order.user_id ? customers.get(order.user_id) : undefined
    return {
      ...order,
      customer_name: customer?.name ?? null,
      customer_email: customer?.email ?? null,
      customer_game_id: customer?.game_id ?? null,
    }
  })

  return NextResponse.json({ items, total: count ?? 0, page, pageSize })
}

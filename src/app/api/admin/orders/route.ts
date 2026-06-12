import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

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

  let query = supabase
    .from("orders")
    .select("id, user_id, total, status, payment_method, payment_status, payment_provider, payment_provider_status, payment_reference, items, created_at, paid_at, cancelled_at", { count: "exact" })
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
  const customers = new Map<string, { name: string | null; email: string | null }>()

  if (userIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, name, nick").in("id", userIds)
    for (const p of profiles ?? []) customers.set(p.id, { name: p.name ?? p.nick ?? null, email: null })

    await Promise.all(userIds.map(async id => {
      const { data: userData } = await supabase.auth.admin.getUserById(id)
      const existing = customers.get(id) ?? { name: null, email: null }
      customers.set(id, { ...existing, email: userData?.user?.email ?? null })
    }))
  }

  const refs = orders.map(o => o.payment_reference).filter((r): r is string => Boolean(r))
  const webhookSeenRefs = new Set<string>()
  if (refs.length) {
    const { data: events } = await supabase.from("payment_webhook_events").select("payment_reference").in("payment_reference", refs)
    for (const e of events ?? []) if (e.payment_reference) webhookSeenRefs.add(e.payment_reference)
  }

  const items = orders.map(order => {
    const customer = order.user_id ? customers.get(order.user_id) : undefined
    const webhookPending = Boolean(
      order.payment_reference &&
      (order.payment_status === "pending" || order.payment_status === "processing") &&
      !webhookSeenRefs.has(order.payment_reference)
    )
    return {
      ...order,
      customer_name: customer?.name ?? null,
      customer_email: customer?.email ?? null,
      webhook_pending: webhookPending,
    }
  })

  return NextResponse.json({ items, total: count ?? 0, page, pageSize })
}

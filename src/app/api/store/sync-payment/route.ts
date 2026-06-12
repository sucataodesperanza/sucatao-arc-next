import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchMercadoPagoPayment, searchMercadoPagoPaymentByExternalReference } from "@/lib/mercadopago"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = body?.orderId
  if (!orderId) {
    return NextResponse.json({ error: "orderId obrigatório." }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, status, payment_status, payment_reference")
    .eq("id", orderId)
    .single()

  if (orderError || !order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
  }

  if (order.payment_status === "paid" || order.payment_status === "failed") {
    return NextResponse.json({ status: order.status, paymentStatus: order.payment_status })
  }

  const payment = order.payment_reference && /^\d+$/.test(order.payment_reference)
    ? await fetchMercadoPagoPayment(order.payment_reference)
    : await searchMercadoPagoPaymentByExternalReference(orderId)

  if (!payment) {
    return NextResponse.json({ status: order.status, paymentStatus: order.payment_status })
  }

  const mpStatus = String(payment.status ?? "").toLowerCase()
  let updates: Record<string, unknown> | null = null

  if (mpStatus === "approved") {
    updates = {
      status: "completed",
      payment_status: "paid",
      payment_reference: String(payment.id),
      payment_provider_status: mpStatus,
      paid_at: new Date().toISOString(),
    }
  } else if (mpStatus === "pending" || mpStatus === "in_process") {
    updates = { payment_status: "processing", payment_reference: String(payment.id), payment_provider_status: mpStatus }
  } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
    updates = {
      status: "cancelled",
      payment_status: "failed",
      payment_reference: String(payment.id),
      payment_provider_status: mpStatus,
      cancelled_at: new Date().toISOString(),
    }
  }

  if (updates) {
    await supabase.from("orders").update(updates).eq("id", orderId)
  }

  return NextResponse.json({
    status: (updates?.status as string) ?? order.status,
    paymentStatus: (updates?.payment_status as string) ?? order.payment_status,
  })
}

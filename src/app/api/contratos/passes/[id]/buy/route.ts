import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createMercadoPagoPixPayment } from "@/lib/mercadopago"
import { isValidCpf } from "@/lib/cpf"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const mode: "points" | "cash" = body.mode === "cash" ? "cash" : "points"

  // Busca o passe
  const { data: pass } = await supabase
    .from("contract_groups")
    .select("id, title, price_points, price_real, active, starts_at, expires_at")
    .eq("id", id)
    .eq("active", true)
    .lte("starts_at", new Date().toISOString())
    .gte("expires_at", new Date().toISOString())
    .single()

  if (!pass) return NextResponse.json({ error: "Passe não encontrado ou expirado." }, { status: 404 })

  // Verifica se já comprou
  const { data: existing } = await supabase
    .from("user_contract_group_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("group_id", id)
    .single()

  if (existing) return NextResponse.json({ error: "Você já possui este passe.", code: "already_purchased" }, { status: 409 })

  const admin = createAdminClient()

  // ── Compra com pontos ──
  if (mode === "points") {
    if (pass.price_points <= 0) return NextResponse.json({ error: "Este passe não está disponível para compra com pontos." }, { status: 400 })

    const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single()
    const currentPoints = (profile as { points: number } | null)?.points ?? 0

    if (currentPoints < pass.price_points) {
      return NextResponse.json({ error: `Pontos insuficientes. Você tem ${currentPoints.toLocaleString("pt-BR")} pts, precisa de ${pass.price_points.toLocaleString("pt-BR")} pts.`, code: "insufficient_points" }, { status: 402 })
    }

    // Debita pontos
    await admin.from("profiles").update({ points: currentPoints - pass.price_points }).eq("id", user.id)

    // Cria registro de compra
    const { error } = await admin.from("user_contract_group_purchases").insert({
      user_id: user.id, group_id: id, payment_method: "points",
    })

    if (error) {
      // Reverte pontos se falhar
      await admin.from("profiles").update({ points: currentPoints }).eq("id", user.id)
      return NextResponse.json({ error: "Erro ao ativar passe." }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: "points" })
  }

  // ── Compra com PIX ──
  if (pass.price_real <= 0) return NextResponse.json({ error: "Este passe não está disponível para compra com PIX." }, { status: 400 })

  const { data: profile } = await supabase.from("profiles").select("cpf").eq("id", user.id).single()
  if (!isValidCpf((profile as { cpf: string | null } | null)?.cpf ?? "")) {
    return NextResponse.json({ error: "Complete seu cadastro com um CPF válido para pagar com PIX.", code: "cadastro_incompleto" }, { status: 409 })
  }

  // Cria order
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id:        user.id,
      total:          pass.price_real,
      status:         "pending",
      payment_method: "loja_oficial",
      payment_status: "pending",
      pass_group_id:  id,
      items: [{
        source: "pass",
        itemId: id,
        name: pass.title,
        quantity: 1,
        mode: "cash",
        price: pass.price_real,
        lineTotal: pass.price_real,
      }],
    })
    .select("id")
    .single()

  if (orderError) return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 })

  // Cria PIX no Mercado Pago
  const fullName = ((user.user_metadata?.name as string | undefined) ?? "").trim()
  const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : ["Comprador"]
  const lastName = rest.join(" ") || firstName

  try {
    const { paymentId, pixCode, pixQrCodeBase64, expiresAt } = await createMercadoPagoPixPayment(
      order.id,
      `Passe ${pass.title}`,
      pass.price_real,
      { email: user.email ?? "comprador@sucatao.com.br", firstName, lastName, cpf: (profile as { cpf: string } | null)?.cpf as string },
      request.nextUrl.origin,
    )

    await admin.from("orders").update({
      payment_provider: "mercado_pago",
      payment_reference: paymentId,
      pix_code: pixCode,
      pix_qr_code_base64: pixQrCodeBase64,
      pix_expires_at: expiresAt,
    }).eq("id", order.id)

    return NextResponse.json({ ok: true, mode: "cash", orderId: order.id })
  } catch (err) {
    await admin.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", order.id)
    return NextResponse.json({ error: "Erro ao iniciar pagamento PIX." }, { status: 502 })
  }
}

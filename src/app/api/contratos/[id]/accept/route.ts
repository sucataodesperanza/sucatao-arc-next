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
  const mode: "points" | "cash" | "free" = body.mode ?? "free"

  // Busca o contrato
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, price_points, price_real, active, expires_at, contract_type, faction_id")
    .eq("id", id)
    .eq("active", true)
    .single()

  if (!contract) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 })

  // Verifica se já aceitou
  const { data: existing } = await supabase
    .from("user_contracts")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("contract_id", id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "Você já aceitou este contrato.", code: "already_accepted" }, { status: 409 })
  }

  const admin = createAdminClient()

  // ── Pagamento com pontos ──
  if (mode === "points") {
    if ((contract.price_points ?? 0) <= 0) {
      return NextResponse.json({ error: "Este contrato não está disponível para compra com pontos." }, { status: 400 })
    }

    const { data: profile } = await supabase.from("profiles").select("points").eq("id", user.id).single()
    const currentPoints = (profile as { points: number } | null)?.points ?? 0

    if (currentPoints < contract.price_points) {
      return NextResponse.json({
        error: `Pontos insuficientes. Você tem ${currentPoints.toLocaleString("pt-BR")} pts, precisa de ${contract.price_points.toLocaleString("pt-BR")} pts.`,
        code: "insufficient_points",
      }, { status: 402 })
    }

    await admin.from("profiles").update({ points: currentPoints - contract.price_points }).eq("id", user.id)

    const { error } = await admin
      .from("user_contracts")
      .insert({ user_id: user.id, contract_id: id, progress: 0, status: "active" })

    if (error) {
      await admin.from("profiles").update({ points: currentPoints }).eq("id", user.id)
      return NextResponse.json({ error: "Erro ao ativar contrato." }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: "points" })
  }

  // ── Pagamento com PIX ──
  if (mode === "cash") {
    if ((contract.price_real ?? 0) <= 0) {
      return NextResponse.json({ error: "Este contrato não está disponível para pagamento com PIX." }, { status: 400 })
    }

    const { data: profile } = await supabase.from("profiles").select("cpf").eq("id", user.id).single()
    if (!isValidCpf((profile as { cpf: string | null } | null)?.cpf ?? "")) {
      return NextResponse.json({ error: "Complete seu cadastro com um CPF válido para pagar com PIX.", code: "cadastro_incompleto" }, { status: 409 })
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id:        user.id,
        total:          contract.price_real,
        status:         "pending",
        payment_method: "loja_oficial",
        payment_status: "pending",
        contract_id:    id,
        items: [{
          source:    "contract",
          itemId:    id,
          name:      contract.title,
          quantity:  1,
          mode:      "cash",
          price:     contract.price_real,
          lineTotal: contract.price_real,
        }],
      })
      .select("id")
      .single()

    if (orderError) return NextResponse.json({ error: "Erro ao criar pedido." }, { status: 500 })

    const fullName = ((user.user_metadata?.name as string | undefined) ?? "").trim()
    const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : ["Comprador"]
    const lastName = rest.join(" ") || firstName

    try {
      const { paymentId, pixCode, pixQrCodeBase64, expiresAt } = await createMercadoPagoPixPayment(
        order.id,
        `Contrato: ${contract.title}`,
        contract.price_real,
        { email: user.email ?? "comprador@sucatao.com.br", firstName, lastName, cpf: (profile as { cpf: string } | null)?.cpf as string },
        request.nextUrl.origin,
      )

      await admin.from("orders").update({
        payment_provider:    "mercado_pago",
        payment_reference:   paymentId,
        pix_code:            pixCode,
        pix_qr_code_base64:  pixQrCodeBase64,
        pix_expires_at:      expiresAt,
      }).eq("id", order.id)

      return NextResponse.json({ ok: true, mode: "cash", orderId: order.id })
    } catch {
      await admin.from("orders").update({ status: "cancelled", payment_status: "failed" }).eq("id", order.id)
      return NextResponse.json({ error: "Erro ao iniciar pagamento PIX." }, { status: 502 })
    }
  }

  // ── Aceite gratuito ──
  const { error } = await admin
    .from("user_contracts")
    .insert({ user_id: user.id, contract_id: id, progress: 0, status: "active" })

  if (error) return NextResponse.json({ error: "Erro ao aceitar contrato." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

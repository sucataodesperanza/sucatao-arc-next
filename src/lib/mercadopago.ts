const MERCADO_PAGO_API = "https://api.mercadopago.com"

export function getMercadoPagoAccessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN
  if (!token) throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.")
  return token
}

function isPubliclyReachableUrl(appUrl: string) {
  try {
    const { protocol, hostname } = new URL(appUrl)
    return protocol === "https:" && hostname !== "localhost" && hostname !== "127.0.0.1"
  } catch {
    return false
  }
}

type PixPayer = {
  email: string
  firstName: string
  lastName: string
  cpf: string
}

export async function createMercadoPagoPixPayment(orderId: string, description: string, total: number, payer: PixPayer, appUrl: string) {
  const accessToken = getMercadoPagoAccessToken()

  const payload: Record<string, unknown> = {
    transaction_amount: Number(total.toFixed(2)),
    description,
    payment_method_id: "pix",
    external_reference: orderId,
    payer: {
      email: payer.email,
      first_name: payer.firstName,
      last_name: payer.lastName,
      identification: { type: "CPF", number: payer.cpf },
    },
  }

  if (isPubliclyReachableUrl(appUrl)) {
    payload.notification_url = `${appUrl}/api/store/webhooks/mercadopago`
  }

  const response = await fetch(`${MERCADO_PAGO_API}/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": orderId,
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error("Mercado Pago payment error:", JSON.stringify({ status: response.status, data, payloadPayer: payload.payer }, null, 2))
    const detail = Array.isArray(data?.cause)
      ? data.cause.map((c: { code?: unknown; description?: string }) => `[${c?.code ?? "?"}] ${c?.description ?? ""}`).filter(Boolean).join(", ")
      : null
    throw new Error(detail || data?.message || "Mercado Pago não retornou o pagamento PIX.")
  }

  const txData = data?.point_of_interaction?.transaction_data
  const pixCode = String(txData?.qr_code || "").trim()
  const pixQrCodeBase64 = String(txData?.qr_code_base64 || "").trim()

  if (!pixCode || !pixQrCodeBase64) {
    throw new Error("Mercado Pago não retornou o QR Code do PIX.")
  }

  return {
    paymentId: String(data.id),
    status: String(data?.status || "pending"),
    pixCode,
    pixQrCodeBase64,
    expiresAt: data?.date_of_expiration ? String(data.date_of_expiration) : null,
  }
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const accessToken = getMercadoPagoAccessToken()
  const response = await fetch(`${MERCADO_PAGO_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null
  return data
}

export async function searchMercadoPagoPaymentByExternalReference(externalReference: string) {
  const accessToken = getMercadoPagoAccessToken()
  const url = `${MERCADO_PAGO_API}/v1/payments/search?sort=date_created&criteria=desc&limit=10&external_reference=${encodeURIComponent(externalReference)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) return null
  const results = Array.isArray(data?.results) ? data.results : []
  return results.find((item: { id?: unknown }) => item?.id) ?? null
}

function parseMercadoPagoSignature(header: string | null) {
  if (!header) return { ts: null as string | null, v1: null as string | null }
  const values = new Map<string, string>()
  header.split(",").map(part => part.trim()).filter(Boolean).forEach(part => {
    const [key, value] = part.split("=")
    if (key && value) values.set(key.trim().toLowerCase(), value.trim())
  })
  return { ts: values.get("ts") ?? null, v1: values.get("v1") ?? null }
}

export async function verifyMercadoPagoWebhookSignature(secret: string, signatureHeader: string | null, requestId: string | null, dataId: string | null) {
  const { ts, v1 } = parseMercadoPagoSignature(signatureHeader)
  if (!ts || !v1 || !requestId || !dataId) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest))
  const expected = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("")

  return expected.toLowerCase() === v1.toLowerCase()
}

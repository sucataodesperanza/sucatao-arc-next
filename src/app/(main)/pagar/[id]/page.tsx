"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import "../../../../styles/pagar.css"

type Order = {
  id: string
  total: number
  status: string
  payment_status: string
  pix_code: string | null
  pix_qr_code_base64: string | null
  pix_expires_at: string | null
}

type Stage = "loading" | "waiting" | "paid" | "expired" | "error"

const POLL_INTERVAL_MS = 4000

function formatNumber(n: number | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function PagarContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pointsOrderId = searchParams.get("pointsOrderId")

  const [order, setOrder] = useState<Order | null>(null)
  const [stage, setStage] = useState<Stage>("loading")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)

  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigatedRef   = useRef(false) // evita navegar mais de uma vez

  const stopTimers = useCallback(() => {
    if (pollRef.current)     { clearInterval(pollRef.current);     pollRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }, [])

  const goToConfirmation = useCallback(() => {
    if (navigatedRef.current) return // já navegou — ignora chamadas extras
    navigatedRef.current = true
    stopTimers()
    const ids = [pointsOrderId, id].filter(Boolean)
    router.replace(`/pedido-confirmado?ids=${ids.join(",")}`)
  }, [id, pointsOrderId, router, stopTimers])

  const fetchOrder = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("orders")
      .select("id, total, status, payment_status, pix_code, pix_qr_code_base64, pix_expires_at")
      .eq("id", id)
      .single()
    return (data ?? null) as Order | null
  }, [id])

  const startCountdown = useCallback((expiresAt: string) => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    setSecondsLeft(calc())

    countdownRef.current = setInterval(() => {
      const remaining = calc()
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        setStage("expired")
        stopTimers()
      }
    }, 1000)
  }, [stopTimers])

  const startPolling = useCallback(() => {
    pollRef.current = setInterval(async () => {
      // Para imediatamente se já navegou ou o ref foi limpo
      if (navigatedRef.current || !pollRef.current) return

      try {
        const syncRes = await fetch("/api/store/sync-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        })

        // 401 = sessão expirada ou usuário saiu — para o polling
        if (syncRes.status === 401 || syncRes.status === 403) {
          stopTimers()
          return
        }

        const updated = await fetchOrder()
        if (updated?.payment_status === "paid") {
          setOrder(updated)
          setStage("paid")
          stopTimers()
          setTimeout(goToConfirmation, 2000)
        } else if (updated?.payment_status === "failed") {
          setOrder(updated)
          setStage("expired")
          stopTimers()
        }
      } catch {}
    }, POLL_INTERVAL_MS)
  }, [fetchOrder, goToConfirmation, id, stopTimers])

  useEffect(() => {
    fetchOrder().then(data => {
      if (!data) {
        setStage("error")
        return
      }
      setOrder(data)

      if (data.payment_status === "paid") {
        setStage("paid")
        setTimeout(goToConfirmation, 1500)
        return
      }

      if (data.payment_status === "failed" || !data.pix_code || !data.pix_qr_code_base64) {
        setStage("expired")
        return
      }

      if (data.pix_expires_at) {
        const remaining = Math.floor((new Date(data.pix_expires_at).getTime() - Date.now()) / 1000)
        if (remaining <= 0) {
          setStage("expired")
          return
        }
        startCountdown(data.pix_expires_at)
      }

      setStage("waiting")
      startPolling()
    })

    return () => stopTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCopy() {
    if (!order?.pix_code) return
    navigator.clipboard.writeText(order.pix_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  if (stage === "loading") {
    return (
      <section className="utility-page">
        <h2>Pagamento PIX</h2>
        <p className="modal-purchase-status">Carregando pagamento...</p>
      </section>
    )
  }

  if (stage === "error" || !order) {
    return (
      <section className="utility-page">
        <h2>Pagamento PIX</h2>
        <div className="cart-empty">
          <p>Não foi possível carregar este pedido.</p>
          <Link href="/loja">Voltar ao catálogo</Link>
        </div>
      </section>
    )
  }

  if (stage === "paid") {
    return (
      <section className="utility-page">
        <h2>Pagamento PIX</h2>
        <div className="cart-confirm-actions">
          <p className="modal-purchase-status">Pagamento aprovado! Redirecionando para a confirmação do pedido...</p>
        </div>
      </section>
    )
  }

  if (stage === "expired") {
    return (
      <section className="utility-page">
        <h2>Pagamento PIX</h2>
        <div className="cart-confirm-actions">
          <p className="modal-purchase-status cart-summary-warn">
            {order.payment_status === "failed" ? "O pagamento não foi aprovado." : "O tempo para pagamento expirou."}
          </p>
          <Link href="/carrinho" className="cart-checkout-button cash">Voltar ao carrinho</Link>
        </div>
      </section>
    )
  }

  const isUrgent = secondsLeft < 120

  return (
    <section className="utility-page">
      <h2>Pagamento PIX</h2>
      <p>Escaneie o QR Code abaixo no app do seu banco ou copie o código PIX.</p>

      <div className="cart-layout">
        <section className="cart-group pix-panel">
          <div className="utility-panel-head">
            <strong>Aguardando pagamento</strong>
            <small className={isUrgent ? "cart-summary-warn" : ""}>Expira em {formatTime(secondsLeft)}</small>
          </div>

          <div className="cart-summary-row">
            <span>Total a pagar</span>
            <strong>R$ {formatNumber(order.total)}</strong>
          </div>

          {order.pix_qr_code_base64 && (
            <div className="pix-qr-box">
              <img src={`data:image/png;base64,${order.pix_qr_code_base64}`} alt="QR Code PIX" width={220} height={220} />
            </div>
          )}

          <div className="pix-code-box">
            <p className="pix-code-text">{order.pix_code}</p>
            <button type="button" className="cart-checkout-button cash" onClick={handleCopy}>
              {copied ? "Copiado!" : "Copiar código PIX"}
            </button>
          </div>

          <p className="modal-purchase-status">
            Assim que o pagamento for confirmado pelo Mercado Pago, esta página será atualizada automaticamente.
          </p>
        </section>

        <div className="cart-confirm-actions">
          <Link href="/carrinho" className="cart-checkout-button cash">Voltar ao carrinho</Link>
        </div>
      </div>
    </section>
  )
}

export default function PagarPage() {
  return (
    <Suspense fallback={
      <section className="utility-page">
        <h2>Pagamento PIX</h2>
        <p className="modal-purchase-status">Carregando pagamento...</p>
      </section>
    }>
      <PagarContent />
    </Suspense>
  )
}

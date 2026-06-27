"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Clock, Copy, Check, AlertTriangle, Loader } from "lucide-react"
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

function formatMoney(n: number | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0")
  const s = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

function StateScreen({ icon, color, title, subtitle, action }: {
  icon: React.ReactNode
  color: string
  title: string
  subtitle: string
  action?: React.ReactNode
}) {
  return (
    <div className="pix-state-screen">
      <div className="pix-state-icon" style={{ "--state-color": color } as React.CSSProperties}>
        {icon}
      </div>
      <h2 className="pix-state-title">{title}</h2>
      <p className="pix-state-subtitle">{subtitle}</p>
      {action && <div className="pix-state-action">{action}</div>}
    </div>
  )
}

function PagarContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pointsOrderId = searchParams.get("pointsOrderId")

  const [order, setOrder]           = useState<Order | null>(null)
  const [stage, setStage]           = useState<Stage>("loading")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied]         = useState(false)

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigatedRef = useRef(false)

  const stopTimers = useCallback(() => {
    if (pollRef.current)      { clearInterval(pollRef.current);      pollRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }, [])

  const goToConfirmation = useCallback(() => {
    if (navigatedRef.current) return
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
      if (remaining <= 0) { setStage("expired"); stopTimers() }
    }, 1000)
  }, [stopTimers])

  const startPolling = useCallback(() => {
    pollRef.current = setInterval(async () => {
      if (navigatedRef.current || !pollRef.current) return
      try {
        const syncRes = await fetch("/api/store/sync-payment", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        })
        if (syncRes.status === 401 || syncRes.status === 403) { stopTimers(); return }
        const updated = await fetchOrder()
        if (updated?.payment_status === "paid") {
          setOrder(updated); setStage("paid"); stopTimers()
          setTimeout(goToConfirmation, 2500)
        } else if (updated?.payment_status === "failed") {
          setOrder(updated); setStage("expired"); stopTimers()
        }
      } catch {}
    }, POLL_INTERVAL_MS)
  }, [fetchOrder, goToConfirmation, id, stopTimers])

  useEffect(() => {
    fetchOrder().then(data => {
      if (!data) { setStage("error"); return }
      setOrder(data)
      if (data.payment_status === "paid") { setStage("paid"); setTimeout(goToConfirmation, 1500); return }
      if (data.payment_status === "failed" || !data.pix_code || !data.pix_qr_code_base64) { setStage("expired"); return }
      if (data.pix_expires_at) {
        const remaining = Math.floor((new Date(data.pix_expires_at).getTime() - Date.now()) / 1000)
        if (remaining <= 0) { setStage("expired"); return }
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

  // ── Estados especiais ──
  if (stage === "loading") return (
    <StateScreen
      icon={<Loader size={52} className="pix-spin" />}
      color="#5fa8ff"
      title="Carregando pagamento..."
      subtitle="Aguarde enquanto buscamos os dados do seu pedido."
    />
  )

  if (stage === "error" || !order) return (
    <StateScreen
      icon={<AlertTriangle size={52} />}
      color="#ffd400"
      title="Pedido não encontrado"
      subtitle="Não foi possível carregar este pedido. Verifique se o link está correto."
      action={<Link href="/loja" className="pix-action-btn">Voltar ao catálogo</Link>}
    />
  )

  if (stage === "paid") return (
    <StateScreen
      icon={<CheckCircle size={64} strokeWidth={1.5} />}
      color="#3df28b"
      title="Pagamento confirmado!"
      subtitle="Seu pagamento foi aprovado. Redirecionando para a confirmação do pedido..."
    />
  )

  if (stage === "expired") return (
    <StateScreen
      icon={<XCircle size={64} strokeWidth={1.5} />}
      color="#ff6171"
      title={order.payment_status === "failed" ? "Pagamento não aprovado" : "PIX expirado"}
      subtitle={order.payment_status === "failed"
        ? "O pagamento não foi confirmado pelo Mercado Pago."
        : "O tempo para pagamento expirou. Volte ao carrinho para tentar novamente."}
      action={<Link href="/carrinho" className="pix-action-btn pix-action-btn--outline">Voltar ao carrinho</Link>}
    />
  )

  // ── Estado principal: aguardando pagamento ──
  const isUrgent = secondsLeft < 120

  return (
    <div className="pix-page">
      {/* Header */}
      <div className="pix-header">
        <h1 className="page-title">Pagamento PIX</h1>
        <p className="pix-subtitle">Escaneie o QR Code ou copie o código no app do seu banco</p>
      </div>

      {/* Card central */}
      <div className="pix-card">
        {/* Total */}
        <div className="pix-total">
          <span>Total a pagar</span>
          <strong>R$ {formatMoney(order.total)}</strong>
        </div>

        {/* QR Code com glow pulsante */}
        {order.pix_qr_code_base64 && (
          <div className={`pix-qr-wrap${isUrgent ? " urgent" : ""}`}>
            <div className="pix-qr-glow" />
            <img
              src={`data:image/png;base64,${order.pix_qr_code_base64}`}
              alt="QR Code PIX"
              width={280}
              height={280}
              className="pix-qr-img"
            />
          </div>
        )}

        {/* Countdown */}
        <div className={`pix-countdown${isUrgent ? " urgent" : ""}`}>
          <Clock size={14} />
          <span>Expira em</span>
          <strong>{formatTime(secondsLeft)}</strong>
        </div>

        {/* Divider */}
        <div className="pix-divider"><span>ou copie o código</span></div>

        {/* Código copia-e-cola */}
        <div className="pix-code-block">
          <p className="pix-code-text">{order.pix_code}</p>
          <button type="button" className={`pix-copy-btn${copied ? " copied" : ""}`} onClick={handleCopy}>
            {copied ? <><Check size={15} />Copiado!</> : <><Copy size={15} />Copiar código PIX</>}
          </button>
        </div>

        {/* Instrução de auto-atualização */}
        <p className="pix-hint">
          Esta página verifica o pagamento automaticamente a cada {POLL_INTERVAL_MS / 1000}s.
        </p>
      </div>
    </div>
  )
}

export default function PagarPage() {
  return (
    <Suspense fallback={
      <StateScreen
        icon={<Loader size={52} className="pix-spin" />}
        color="#5fa8ff"
        title="Carregando pagamento..."
        subtitle="Aguarde enquanto buscamos os dados do seu pedido."
      />
    }>
      <PagarContent />
    </Suspense>
  )
}

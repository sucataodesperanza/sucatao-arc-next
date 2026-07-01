"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Coins, CreditCard, AlertTriangle, ArrowRight, Zap, Package, Tag, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/cart-context"
import { CartItemRow } from "@/components/cart-item-row"
import { isValidCpf } from "@/lib/cpf"
import "../../../styles/carrinho.css"

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function formatCash(n: number) { return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

type AppliedCoupon = { id: string; code: string; discount: number; discount_type: "fixed" | "percentage" }

export default function CarrinhoPage() {
  const router = useRouter()
  const cart = useCart()
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [hasCpf, setHasCpf] = useState(false)
  const [hasGameId, setHasGameId] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState("")
  const [loadingUser, setLoadingUser] = useState(true)
  const [hasDiscord, setHasDiscord] = useState<boolean | null>(null)
  const [discordMsg, setDiscordMsg] = useState("")
  const [couponInput, setCouponInput] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const couponInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoadingUser(false)
      if (!user) return
      setUserId(user.id)
      supabase.from("profiles").select("points, cpf, game_id, discord_id").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setPoints(data.points ?? 0)
          setHasCpf(isValidCpf(data.cpf ?? ""))
          setHasGameId(Boolean(data.game_id?.trim()))
          setHasDiscord(Boolean(data.discord_id))
        }
      })
      // Toast de retorno do OAuth Discord
      const params = new URLSearchParams(window.location.search)
      if (params.get("discord") === "connected") setDiscordMsg("connected")
      if (params.get("discord") === "error")     setDiscordMsg("error")
      if (params.get("discord")) {
        const clean = new URL(window.location.href)
        clean.searchParams.delete("discord")
        window.history.replaceState({}, "", clean.toString())
      }
    })
  }, [])

  const pointsItems = cart.items.filter(i => i.mode === "points")
  const cashItems   = cart.items.filter(i => i.mode === "cash")

  const pointsTotal = pointsItems.reduce((sum, i) => sum + (i.pricePoints ?? Math.round(i.value * 24)) * i.quantity, 0)
  const cashTotal   = cashItems.reduce((sum, i) => sum + (i.priceCash ?? i.value) * i.quantity, 0)
  const totalItems  = cart.items.reduce((s, i) => s + i.quantity, 0)

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? cashTotal * appliedCoupon.discount / 100
      : Math.min(cashTotal, appliedCoupon.discount)
    : 0
  const finalCashTotal = Math.max(0, cashTotal - discountAmount)

  const insufficientPoints = pointsItems.length > 0 && pointsTotal > points
  const needsGameId  = userId && !hasGameId
  const needsCpf     = cashItems.length > 0 && userId && hasGameId && !hasCpf
  const needsDiscord = cashItems.length > 0 && Boolean(userId) && hasDiscord === false
  const canCheckout  = !insufficientPoints && !needsGameId

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponLoading(true)
    setCouponError("")
    const res = await fetch("/api/store/validate-coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    const data = await res.json().catch(() => ({}))
    setCouponLoading(false)
    if (res.ok) {
      setAppliedCoupon(data.coupon)
      setCouponInput("")
    } else {
      setCouponError(data.error ?? "Cupom inválido.")
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null)
    setCouponError("")
    setCouponInput("")
    couponInputRef.current?.focus()
  }

  async function handleCheckout() {
    if (!userId) { router.push("/login"); return }
    if (!hasGameId) { router.push(`/completar-cadastro?next=/carrinho${cashItems.length > 0 && !hasCpf ? "&cpf=1" : ""}`); return }
    if (cashItems.length > 0 && !hasCpf) { router.push("/completar-cadastro?next=/carrinho&cpf=1"); return }

    setCheckingOut(true)
    setMessage("")

    const res = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items, couponCode: appliedCoupon?.code ?? null }),
    })
    const resBody = await res.json().catch(() => ({}))
    setCheckingOut(false)

    if (res.ok) {
      cart.clear()
      if (resBody.cashOrderId) {
        const extra = resBody.pointsOrderId ? `?pointsOrderId=${resBody.pointsOrderId}` : ""
        router.push(`/pagar/${resBody.cashOrderId}${extra}`)
        return
      }
      const ids = [resBody.pointsOrderId, resBody.cashOrderId].filter(Boolean)
      router.push(`/pedido-confirmado?ids=${ids.join(",")}`)
    } else {
      setMessage(`${resBody.error ?? "Erro ao finalizar pedido."}${resBody.detail ? ` (${resBody.detail})` : ""}`)
    }
  }

  return (
    <>
    <div className="carrinho-page">
      {/* Header */}
      <div className="carrinho-header">
        <div>
          <h1 className="page-title">Carrinho</h1>
          <p className="carrinho-subtitle">
            {totalItems > 0
              ? `${totalItems} item${totalItems !== 1 ? "s" : ""} no carrinho`
              : "Seu carrinho está vazio"}
          </p>
        </div>
        {totalItems > 0 && (
          <a href="/loja" className="carrinho-back-link">
            Continuar comprando <ArrowRight size={14} />
          </a>
        )}
      </div>

      {/* Carrinho vazio */}
      {cart.items.length === 0 ? (
        <div className="carrinho-empty">
          <div className="carrinho-empty-icon">
            <ShoppingCart size={48} style={{ opacity: 0.25 }} />
          </div>
          <h2>Seu carrinho está vazio</h2>
          <p>Explore o catálogo e adicione itens para resgatar ou comprar.</p>
          <a href="/loja" className="carrinho-checkout-btn" style={{ display: "inline-flex", width: "auto", padding: "13px 28px", textDecoration: "none" }}>
            <Zap size={14} fill="currentColor" />
            Ver catálogo
          </a>
        </div>
      ) : (
        <div className="carrinho-layout">
          {/* ── Coluna esquerda: itens ── */}
          <div className="carrinho-items">
            {/* Grupo: Pontos */}
            {pointsItems.length > 0 && (
              <div className="carrinho-group carrinho-group--points">
                <div className="carrinho-group-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="carrinho-group-icon" style={{ background: "rgba(255,212,0,0.15)", color: "var(--yellow)" }}>
                      <Coins size={16} />
                    </div>
                    <div>
                      <strong className="carrinho-group-title">Resgate com Pontos</strong>
                      <span className="carrinho-group-count">{pointsItems.length} item{pointsItems.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <span className="carrinho-group-total" style={{ color: "var(--yellow)" }}>
                    {formatNumber(pointsTotal)} pts
                  </span>
                </div>
                <div className="cart-list">
                  {pointsItems.map(item => (
                    <CartItemRow
                      key={`${item.mode}-${item.itemId}`}
                      item={item}
                      onIncrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity + 1)}
                      onDecrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity - 1)}
                      onRemove={() => cart.removeItem(item.itemId, item.mode)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grupo: Saldo real */}
            {cashItems.length > 0 && (
              <div className="carrinho-group carrinho-group--cash">
                <div className="carrinho-group-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="carrinho-group-icon" style={{ background: "rgba(61,242,139,0.15)", color: "var(--green)" }}>
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <strong className="carrinho-group-title">Compra com Saldo Real</strong>
                      <span className="carrinho-group-count">{cashItems.length} item{cashItems.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <span className="carrinho-group-total" style={{ color: "var(--green)" }}>
                    R$ {cashTotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                <div className="cart-list">
                  {cashItems.map(item => (
                    <CartItemRow
                      key={`${item.mode}-${item.itemId}`}
                      item={item}
                      onIncrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity + 1)}
                      onDecrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity - 1)}
                      onRemove={() => cart.removeItem(item.itemId, item.mode)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: resumo fixo ── */}
          <div className="carrinho-sidebar">
            <div className="carrinho-summary">
              <h2 className="carrinho-summary-title">Resumo do Pedido</h2>

              {/* Totais */}
              <div className="carrinho-summary-rows">
                {pointsItems.length > 0 && (
                  <div className="carrinho-summary-row">
                    <span><Coins size={13} style={{ color: "var(--yellow)", marginRight: 4 }} />Pontos necessários</span>
                    <strong style={{ color: insufficientPoints ? "var(--red)" : "var(--yellow)" }}>
                      {formatNumber(pointsTotal)}
                    </strong>
                  </div>
                )}
                {userId && pointsItems.length > 0 && (
                  <div className="carrinho-summary-row">
                    <span style={{ color: "var(--gray-500)" }}>Seu saldo</span>
                    <span style={{ color: insufficientPoints ? "var(--red)" : "var(--paper)", fontWeight: 800 }}>
                      {formatNumber(points)} pts
                    </span>
                  </div>
                )}
                {userId && pointsItems.length > 0 && !insufficientPoints && (
                  <div className="carrinho-summary-row">
                    <span style={{ color: "var(--gray-500)" }}>Após resgate</span>
                    <span style={{ color: "var(--green)", fontWeight: 950 }}>
                      {formatNumber(points - pointsTotal)} pts
                    </span>
                  </div>
                )}
                {cashItems.length > 0 && (
                  <>
                    {discountAmount > 0 && (
                      <>
                        <div className="carrinho-summary-row">
                          <span style={{ color: "var(--gray-500)" }}>
                            <Tag size={13} style={{ marginRight: 4 }} />Subtotal
                          </span>
                          <span style={{ color: "var(--gray-500)", textDecoration: "line-through" }}>
                            R$ {formatCash(cashTotal)}
                          </span>
                        </div>
                        <div className="carrinho-summary-row">
                          <span style={{ color: "var(--green)" }}>
                            <Tag size={13} style={{ marginRight: 4 }} />
                            Cupom {appliedCoupon?.code}
                          </span>
                          <strong style={{ color: "var(--green)" }}>
                            − R$ {formatCash(discountAmount)}
                          </strong>
                        </div>
                      </>
                    )}
                    <div className="carrinho-summary-row carrinho-summary-row--total">
                      <span><CreditCard size={13} style={{ color: "var(--green)", marginRight: 4 }} />Total PIX</span>
                      <strong style={{ color: "var(--green)" }}>
                        R$ {formatCash(finalCashTotal)}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* Campo de cupom (só para itens em dinheiro) */}
              {cashItems.length > 0 && (
                <div className="carrinho-coupon">
                  {appliedCoupon ? (
                    <div className="carrinho-coupon-applied">
                      <Tag size={13} />
                      <span>
                        <strong>{appliedCoupon.code}</strong>
                        {appliedCoupon.discount_type === "percentage"
                          ? ` — ${appliedCoupon.discount}% off`
                          : ` — R$ ${formatCash(appliedCoupon.discount)} off`}
                      </span>
                      <button type="button" aria-label="Remover cupom" onClick={removeCoupon}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="carrinho-coupon-row">
                        <input
                          ref={couponInputRef}
                          type="text"
                          className="carrinho-coupon-input"
                          placeholder="Código do cupom"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                          onKeyDown={e => { if (e.key === "Enter") applyCoupon() }}
                          maxLength={32}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="carrinho-coupon-btn"
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                        >
                          {couponLoading ? "..." : "Aplicar"}
                        </button>
                      </div>
                      {couponError && (
                        <p className="carrinho-coupon-error">{couponError}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Card Discord — bloqueio para PIX */}
              {needsDiscord && (
                <div style={{ margin: "16px 0 0", padding: 16, borderRadius: 12, background: "rgba(88,101,242,0.10)", border: "1px solid rgba(88,101,242,0.28)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(88,101,242,0.18)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <svg width="16" height="12" viewBox="0 0 24 18" fill="none" style={{ color: "#7289da" }}>
                        <path d="M20.317 1.492a19.825 19.825 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03zM8.02 12.278c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
                      </svg>
                    </div>
                    <strong style={{ fontSize: 13, color: "#a5b4fc" }}>Discord necessário para compras PIX</strong>
                  </div>
                  <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--gray-400)" }}>
                    <li>📦 Canal privado criado exclusivamente para o seu pedido</li>
                    <li>💬 Combine a entrega in-game direto com nossa equipe</li>
                    <li>🔔 DM imediata quando o pagamento for confirmado</li>
                  </ul>
                  <a href="/api/auth/discord?return_to=/carrinho" className="carrinho-checkout-btn" style={{ marginTop: 4, textDecoration: "none", background: "#5865f2" }}>
                    <svg width="16" height="12" viewBox="0 0 24 18" fill="none">
                      <path d="M20.317 1.492a19.825 19.825 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03zM8.02 12.278c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
                    </svg>
                    Conectar Discord
                  </a>
                </div>
              )}

              {/* Avisos */}
              {insufficientPoints && (
                <div className="carrinho-alert carrinho-alert--warn">
                  <AlertTriangle size={14} />
                  <span>Pontos insuficientes. Remova itens ou ajuste a quantidade.</span>
                </div>
              )}
              {needsGameId && (
                <div className="carrinho-alert carrinho-alert--info">
                  <AlertTriangle size={14} />
                  <span>Complete seu cadastro com o ID do jogo antes de finalizar.</span>
                </div>
              )}
              {needsCpf && (
                <div className="carrinho-alert carrinho-alert--info">
                  <AlertTriangle size={14} />
                  <span>Adicione seu CPF no perfil para pagar com PIX.</span>
                </div>
              )}
              {message && (
                <div className="carrinho-alert carrinho-alert--warn">
                  <AlertTriangle size={14} />
                  <span>{message}</span>
                </div>
              )}

              {/* Botão */}
              {!loadingUser && !userId ? (
                <a href="/login" className="carrinho-checkout-btn" style={{ marginTop: 16, textDecoration: "none" }}>
                  <Zap size={14} fill="currentColor" />
                  Entrar para finalizar
                </a>
              ) : !needsDiscord && (
                <button
                  type="button"
                  className="carrinho-checkout-btn"
                  style={{ marginTop: 16 }}
                  disabled={checkingOut || insufficientPoints}
                  onClick={handleCheckout}
                >
                  <Zap size={14} fill="currentColor" />
                  {checkingOut
                    ? "Processando..."
                    : needsGameId || needsCpf
                    ? "Completar cadastro"
                    : "Finalizar pedido"}
                </button>
              )}

              <p style={{ margin: "12px 0 0", fontSize: 11, color: "var(--gray-500)", textAlign: "center", lineHeight: 1.5 }}>
                Itens com pontos são entregues imediatamente. Compras com PIX exigem confirmação de pagamento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>

    {discordMsg === "connected" && (
      <div className="app-toast" data-tone="success" role="status" aria-live="polite">✓ Discord conectado! Agora você pode finalizar o pedido.</div>
    )}
    {discordMsg === "error" && (
      <div className="app-toast" data-tone="error" role="status" aria-live="polite">✗ Erro ao conectar o Discord. Tente novamente.</div>
    )}
    </>
  )
}

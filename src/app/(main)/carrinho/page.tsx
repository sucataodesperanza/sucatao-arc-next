"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Coins, CreditCard, AlertTriangle, ArrowRight, Zap, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/cart-context"
import { CartItemRow } from "@/components/cart-item-row"
import { isValidCpf } from "@/lib/cpf"
import "../../../styles/carrinho.css"

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoadingUser(false)
      if (!user) return
      setUserId(user.id)
      supabase.from("profiles").select("points, cpf, game_id").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setPoints(data.points ?? 0)
          setHasCpf(isValidCpf(data.cpf ?? ""))
          setHasGameId(Boolean(data.game_id?.trim()))
        }
      })
    })
  }, [])

  const pointsItems = cart.items.filter(i => i.mode === "points")
  const cashItems   = cart.items.filter(i => i.mode === "cash")

  const pointsTotal = pointsItems.reduce((sum, i) => sum + Math.round(i.value * 24) * i.quantity, 0)
  const cashTotal   = cashItems.reduce((sum, i) => sum + i.value * i.quantity, 0)
  const totalItems  = cart.items.reduce((s, i) => s + i.quantity, 0)

  const insufficientPoints = pointsItems.length > 0 && pointsTotal > points
  const needsGameId  = userId && !hasGameId
  const needsCpf     = cashItems.length > 0 && userId && hasGameId && !hasCpf
  const canCheckout  = !insufficientPoints && !needsGameId

  async function handleCheckout() {
    if (!userId) { router.push("/login"); return }
    if (!hasGameId) { router.push(`/completar-cadastro?next=/carrinho${cashItems.length > 0 && !hasCpf ? "&cpf=1" : ""}`); return }
    if (cashItems.length > 0 && !hasCpf) { router.push("/completar-cadastro?next=/carrinho&cpf=1"); return }

    setCheckingOut(true)
    setMessage("")

    const res = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items }),
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
          <a href="/loja" className="btn-aceitar" style={{ display: "inline-flex", width: "auto", padding: "13px 28px", textDecoration: "none" }}>
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
                  <div className="carrinho-summary-row carrinho-summary-row--total">
                    <span><CreditCard size={13} style={{ color: "var(--green)", marginRight: 4 }} />Total PIX</span>
                    <strong style={{ color: "var(--green)" }}>
                      R$ {cashTotal.toFixed(2).replace(".", ",")}
                    </strong>
                  </div>
                )}
              </div>

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
                <a href="/login" className="btn-aceitar" style={{ marginTop: 16, textDecoration: "none" }}>
                  <Zap size={14} fill="currentColor" />
                  Entrar para finalizar
                </a>
              ) : (
                <button
                  type="button"
                  className="btn-aceitar"
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
  )
}

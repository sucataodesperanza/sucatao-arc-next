"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/cart-context"
import { CartItemRow } from "@/components/cart-item-row"
import { isValidCpf } from "@/lib/cpf"

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

export default function CarrinhoPage() {
  const router = useRouter()
  const cart = useCart()
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [hasCpf, setHasCpf] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [message, setMessage] = useState("")
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoadingUser(false)
      if (!user) return
      setUserId(user.id)
      supabase.from("profiles").select("points, cpf").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setPoints(data.points ?? 0)
          setHasCpf(isValidCpf(data.cpf ?? ""))
        }
      })
    })
  }, [])

  const pointsItems = cart.items.filter(i => i.mode === "points")
  const cashItems = cart.items.filter(i => i.mode === "cash")

  const pointsTotal = pointsItems.reduce((sum, i) => sum + Math.round(i.value * 24) * i.quantity, 0)
  const cashTotal = cashItems.reduce((sum, i) => sum + i.value * i.quantity, 0)

  async function handleCheckout() {
    if (!userId) { router.push("/login"); return }

    if (cashItems.length > 0 && !hasCpf) {
      router.push("/completar-cadastro?next=/carrinho")
      return
    }

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
    <section className="utility-page">
      <h2>Carrinho</h2>
      <p>Itens separados para resgate com pontos ou compra com saldo real na loja oficial.</p>

      {cart.items.length === 0 ? (
        <div className="cart-empty">
          <p>Seu carrinho está vazio.</p>
          <a href="/itens">Voltar ao catálogo</a>
        </div>
      ) : (
        <div className="cart-layout">
          {pointsItems.length > 0 && (
            <section className="cart-group">
              <div className="utility-panel-head">
                <strong>Resgate com pontos</strong>
                <small>{pointsItems.length} item(ns)</small>
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
            </section>
          )}

          {cashItems.length > 0 && (
            <section className="cart-group">
              <div className="utility-panel-head">
                <strong>Compra com saldo real</strong>
                <small>{cashItems.length} item(ns)</small>
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
            </section>
          )}

          <section className="cart-summary">
            <div className="utility-panel-head">
              <strong>Resumo</strong>
              <small>Checkout</small>
            </div>
            {pointsItems.length > 0 && (
              <div className="cart-summary-row">
                <span>Total em pontos</span>
                <strong className={pointsTotal > points ? "cart-summary-warn" : ""}>{formatNumber(pointsTotal)}</strong>
              </div>
            )}
            {userId && pointsItems.length > 0 && (
              <div className="cart-summary-row">
                <span>Seus pontos</span>
                <strong>{formatNumber(points)}</strong>
              </div>
            )}
            {cashItems.length > 0 && (
              <div className="cart-summary-row">
                <span>Total saldo real</span>
                <strong>{formatNumber(cashTotal)}</strong>
              </div>
            )}

            {cashItems.length > 0 && userId && !hasCpf && (
              <p className="modal-purchase-status cart-summary-warn">
                Para pagar com PIX, complete seu cadastro com o CPF antes de finalizar o pedido.
              </p>
            )}

            {!loadingUser && !userId ? (
              <p className="modal-purchase-status">Entre na sua conta para finalizar o pedido.</p>
            ) : (
              <button type="button" className="cart-checkout-button" disabled={checkingOut || (pointsTotal > points && pointsItems.length > 0)} onClick={handleCheckout}>
                {checkingOut
                  ? "Processando..."
                  : cashItems.length > 0 && !hasCpf
                    ? "Completar cadastro"
                    : "Finalizar pedido"}
              </button>
            )}
            {pointsItems.length > 0 && pointsTotal > points && (
              <p className="modal-purchase-status cart-summary-warn">Pontos insuficientes para o resgate. Remova itens ou ajuste a quantidade.</p>
            )}
            {message && <p className="modal-purchase-status">{message}</p>}
          </section>
        </div>
      )}
    </section>
  )
}

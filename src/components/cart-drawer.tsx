"use client"

import Link from "next/link"
import { useCart } from "@/lib/cart-context"
import { CartItemRow } from "./cart-item-row"

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function formatCash(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export function CartDrawer() {
  const cart = useCart()

  const pointsTotal = cart.items.filter(i => i.mode === "points").reduce((sum, i) => sum + (i.pricePoints ?? Math.round(i.value * 24)) * i.quantity, 0)
  const cashTotal   = cart.items.filter(i => i.mode === "cash").reduce((sum, i) => sum + (i.priceCash ?? i.value) * i.quantity, 0)

  return (
    <>
      <div className={`cart-drawer-backdrop${cart.isOpen ? " open" : ""}`} onClick={cart.closeDrawer} aria-hidden />
      <aside className={`cart-drawer${cart.isOpen ? " open" : ""}`} aria-label="Carrinho" aria-hidden={!cart.isOpen}>
        <div className="cart-drawer-head">
          <strong>Carrinho ({cart.totalCount})</strong>
          <button type="button" className="cart-drawer-close" onClick={cart.closeDrawer} aria-label="Fechar carrinho">×</button>
        </div>
        <div className="cart-drawer-body">
          {cart.items.length === 0 ? (
            <p className="cart-drawer-empty">Seu carrinho está vazio.</p>
          ) : (
            cart.items.map(item => (
              <CartItemRow
                key={`${item.mode}-${item.itemId}`}
                item={item}
                onIncrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity + 1)}
                onDecrease={() => cart.updateQuantity(item.itemId, item.mode, item.quantity - 1)}
                onRemove={() => cart.removeItem(item.itemId, item.mode)}
              />
            ))
          )}
        </div>
        {cart.items.length > 0 && (
          <div className="cart-drawer-footer">
            {pointsTotal > 0 && (
              <div className="cart-summary-row">
                <span>Total em pontos</span>
                <strong>{formatNumber(pointsTotal)}</strong>
              </div>
            )}
            {cashTotal > 0 && (
              <div className="cart-summary-row">
                <span>Total saldo real</span>
                <strong>R$ {formatCash(cashTotal)}</strong>
              </div>
            )}
            <Link href="/carrinho" className="cart-checkout-button" onClick={cart.closeDrawer}>
              Ver carrinho completo
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}

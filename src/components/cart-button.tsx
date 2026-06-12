"use client"

import { useCart } from "@/lib/cart-context"

export function CartButton() {
  const cart = useCart()

  return (
    <button type="button" className="cart-button" aria-label="Abrir carrinho" onClick={cart.toggleDrawer}>
      <span className="cart-icon" aria-hidden>🛒</span>
      <span>Carrinho</span>
      {cart.totalCount > 0 && <span className="cart-badge">{cart.totalCount}</span>}
    </button>
  )
}

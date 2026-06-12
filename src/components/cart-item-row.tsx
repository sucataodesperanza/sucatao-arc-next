"use client"

import type { CartItem } from "@/lib/cart-context"

const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

type Props = {
  item: CartItem
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export function CartItemRow({ item, onIncrease, onDecrease, onRemove }: Props) {
  const lineValue = item.mode === "points" ? Math.round(item.value * 24) * item.quantity : item.value * item.quantity

  return (
    <div className="cart-item">
      <div className="cart-item-media" style={{ "--rarity-color": rarityColors[item.rarity ?? "Unknown"] } as React.CSSProperties}>
        {item.image
          ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
          : <div className="placeholder">{item.name[0]?.toUpperCase()}</div>}
      </div>
      <div className="cart-item-info">
        <strong>{item.name}</strong>
        <span>{item.type ?? "Item"} · {item.mode === "points" ? "Resgate com pontos" : "Compra com saldo real"}</span>
      </div>
      <div className="cart-item-controls">
        <button type="button" onClick={onDecrease} aria-label="Diminuir quantidade">-</button>
        <span>{item.quantity}</span>
        <button type="button" onClick={onIncrease} aria-label="Aumentar quantidade">+</button>
      </div>
      <div className="cart-item-value">
        <strong>{formatNumber(lineValue)}</strong>
        <span>{item.mode === "points" ? "pontos" : "valor real"}</span>
      </div>
      <button type="button" className="cart-item-remove" onClick={onRemove} aria-label="Remover item">×</button>
    </div>
  )
}

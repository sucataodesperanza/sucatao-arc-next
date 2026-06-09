"use client"

import { useState } from "react"
import { SellerProductModal } from "./seller-product-modal"

export type PricingOption = {
  id: string
  label: string
  unitQuantity: number
  price: number
  isDefault?: boolean
}

export type ArcItemSnapshot = {
  value?: number
  weightKg?: number
  stackSize?: number
  isWeapon?: boolean
  isCraftable?: boolean
  isBlueprint?: boolean
  isRecyclable?: boolean
}

export type SellerProduct = {
  inventoryId: string
  stock: number
  product: {
    id: string
    name: string
    description: string | null
    price: number
    image_url: string | null
    featured: boolean
    pricing_options: PricingOption[]
    rarity: { id: string; label: string; color: string } | null
    category: { id: string; label: string } | null
    arcItem?: ArcItemSnapshot
  }
  sellerId: string
}

export function SellerProductCard({ item }: { item: SellerProduct }) {
  const [open, setOpen] = useState(false)
  const { product, stock } = item
  const rarity = product.rarity
  const category = product.category
  const rarityColor = rarity?.color ?? "#64748b"
  const defaultOption = product.pricing_options.find(o => o.isDefault) ?? product.pricing_options[0]
  const displayPrice = defaultOption?.price ?? product.price
  const arcValue = product.arcItem?.value

  return (
    <>
      <article
        style={{
          background: "var(--surface-2, #0d1117)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          flexDirection: "column",
          cursor: "pointer",
          position: "relative",
          transition: "border-color 0.15s",
        }}
        onClick={() => setOpen(true)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: "10px", fontWeight: 950, textTransform: "uppercase", color: rarityColor, background: `${rarityColor}28`, padding: "2px 8px", letterSpacing: "0.05em" }}>
            {rarity?.label ?? "Comum"}
          </span>
          {category && (
            <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>
              {category.label}
            </span>
          )}
        </div>

        <div style={{ position: "relative", background: "rgba(0,0,0,0.3)", padding: "16px", display: "grid", placeItems: "center", minHeight: "130px" }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ maxHeight: "110px", maxWidth: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ height: "80px", display: "grid", placeItems: "center" }}>
              <span style={{ color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 800 }}>Sem imagem</span>
            </div>
          )}
          {product.featured && (
            <div style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(0,217,255,0.15)", border: "1px solid var(--cyan)", padding: "2px 8px", fontSize: "9px", fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", letterSpacing: "0.08em" }}>
              Destaque
            </div>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation() }}
            style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", width: "26px", height: "26px", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--muted)", fontSize: "13px" }}
            aria-label="Favoritar"
          >
            ♡
          </button>
        </div>

        <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <strong style={{ fontSize: "14px", fontWeight: 950, display: "block", lineHeight: 1.2 }}>{product.name}</strong>
            {category && (
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 800, textTransform: "uppercase" }}>{category.label}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { label: "Valor Real", value: displayPrice.toLocaleString("pt-BR"), color: "var(--yellow)" },
              { label: "Pontos do site", value: arcValue != null ? arcValue.toLocaleString("pt-BR") : "—", color: arcValue != null ? "var(--yellow)" : "var(--muted)" },
              { label: "Estoque", value: String(stock), color: "var(--text)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.06em" }}>{label}</span>
                <strong style={{ fontSize: "14px", color }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.05)" }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            disabled
            style={{ flex: 1, border: 0, borderRight: "1px solid rgba(255,255,255,0.05)", background: "transparent", color: "var(--muted)", cursor: "not-allowed", minHeight: "38px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", opacity: 0.5 }}
          >
            Resgatar
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ flex: 1, border: 0, background: "rgba(255,212,0,0.06)", color: "var(--yellow)", cursor: "pointer", minHeight: "38px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
          >
            Comprar
          </button>
        </div>
      </article>

      {open && (
        <SellerProductModal
          item={item}
          sellerId={item.sellerId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

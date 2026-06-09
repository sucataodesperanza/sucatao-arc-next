"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { SellerProduct } from "./seller-product-card"

type UserProfile = {
  name: string | null
  game_id: string | null
}

type Props = {
  item: SellerProduct
  sellerId: string
  onClose: () => void
}

export function SellerProductModal({ item, sellerId, onClose }: Props) {
  const { product, stock } = item
  const rarity = product.rarity
  const category = product.category

  const defaultOption = product.pricing_options.find(o => o.isDefault) ?? product.pricing_options[0]
  const [selectedOption, setSelectedOption] = useState(defaultOption)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from("profiles")
        .select("name, game_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  async function handleBuy() {
    if (!userId) { setStatus("Você precisa estar logado para comprar."); return }
    if (!selectedOption) { setStatus("Selecione uma opção."); return }
    setLoading(true)
    setStatus("")

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId,
        inventoryId: item.inventoryId,
        productId: product.id,
        productName: product.name,
        pricingOptionId: selectedOption.id,
        pricingOptionLabel: selectedOption.label,
        unitQuantity: selectedOption.unitQuantity,
        price: selectedOption.price,
        total: selectedOption.price,
        buyerGameId: profile?.game_id ?? null,
      }),
    })

    setLoading(false)
    if (res.ok) {
      setDone(true)
      setStatus("Pedido criado! Um admin vai entrar em contato para concluir a entrega.")
    } else {
      const body = await res.json().catch(() => ({}))
      setStatus(body.error ?? "Erro ao criar pedido. Tente novamente.")
    }
  }

  const rarityColor = rarity?.color ?? "var(--muted)"
  const rarityLabel = rarity?.label?.toUpperCase() ?? "COMUM"
  const categoryLabel = category?.label?.toUpperCase() ?? ""

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: "16px", background: "rgba(2,5,10,0.92)", backdropFilter: "blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: "var(--surface-2, #0d1117)", border: "1px solid var(--line)", width: "100%", maxWidth: "680px", display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--line)", color: "var(--muted)", width: "28px", height: "28px", cursor: "pointer", fontSize: "14px", fontWeight: 950, display: "grid", placeItems: "center", zIndex: 1 }}
          aria-label="Fechar"
        >×</button>

        <div style={{ display: "flex", gap: 0, minHeight: "280px" }}>
          <div style={{ width: "220px", flexShrink: 0, background: "rgba(0,0,0,0.3)", display: "grid", placeItems: "center", padding: "24px" }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} style={{ width: "100%", maxHeight: "180px", objectFit: "contain" }} />
            ) : (
              <div style={{ width: "120px", height: "120px", background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center" }}>
                <span style={{ color: "var(--muted)", fontSize: "10px", textTransform: "uppercase", fontWeight: 800 }}>Sem imagem</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: "24px 24px 24px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: rarityColor }}>
                {rarityLabel}{categoryLabel ? ` // ${categoryLabel}` : ""}
              </p>
              <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 950, textTransform: "uppercase", lineHeight: 1 }}>{product.name}</h2>
            </div>

            {product.description && (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", lineHeight: 1.5 }}>{product.description}</p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "VALOR REAL", value: `${selectedOption?.price?.toLocaleString("pt-BR") ?? "—"}` },
                { label: "PONTOS DO SITE", value: "Em breve" },
                { label: "ESTOQUE", value: String(stock) },
                { label: "OPÇÃO", value: selectedOption?.label ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(0,0,0,0.3)", padding: "10px 12px", border: "1px solid var(--line-soft, rgba(255,255,255,0.06))" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)" }}>{label}</p>
                  <strong style={{ fontSize: "16px", color: label === "VALOR REAL" ? "var(--yellow)" : label === "PONTOS DO SITE" ? "var(--muted)" : "var(--cyan)" }}>{value}</strong>
                </div>
              ))}
            </div>

            {product.pricing_options.length > 1 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {product.pricing_options.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOption(opt)}
                    style={{ border: `1px solid ${opt.id === selectedOption?.id ? "var(--cyan)" : "var(--line)"}`, background: opt.id === selectedOption?.id ? "rgba(0,217,255,0.08)" : "transparent", color: opt.id === selectedOption?.id ? "var(--cyan)" : "var(--muted)", padding: "6px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer" }}
                  >
                    {opt.label} — R$ {opt.price.toLocaleString("pt-BR")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {!done && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                disabled
                style={{ flex: 1, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", cursor: "not-allowed", minHeight: "42px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", opacity: 0.5 }}
              >
                Resgatar com pontos
              </button>
              <button
                type="button"
                onClick={handleBuy}
                disabled={loading || !userId}
                style={{ flex: 1, border: "1px solid rgba(255,212,0,0.3)", background: loading ? "rgba(255,212,0,0.03)" : "rgba(255,212,0,0.06)", color: "var(--yellow)", cursor: loading || !userId ? "not-allowed" : "pointer", minHeight: "42px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Aguarde..." : "Comprar com saldo real"}
              </button>
            </div>
          )}

          {profile?.game_id && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>
              Game ID: <strong style={{ color: "var(--text)" }}>{profile.game_id}</strong>
              {" // "}Estoque: <strong style={{ color: "var(--text)" }}>{stock}</strong>
            </p>
          )}

          {!userId && (
            <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", fontWeight: 800 }}>
              <a href="/login" style={{ color: "var(--cyan)", textDecoration: "none" }}>Entre na sua conta</a> para comprar.
            </p>
          )}

          {status && (
            <p style={{ margin: 0, fontSize: "12px", fontWeight: 800, color: done ? "var(--cyan)" : "var(--yellow)" }}>{status}</p>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import arcData from "@/data/arc-data"

type Item = { id: string; name: string; type?: string; value?: number; image?: string }
type Trade = { trader?: string; itemId?: string; cost?: { itemId?: string; quantity?: number }; reward?: unknown; notes?: string; dailyLimit?: number }

const rawData = arcData as unknown as { items: Item[]; bots: unknown[]; maps: unknown[]; trades: { value: Trade[]; Count: number } }
const allTrades: Trade[] = Array.isArray(rawData.trades) ? rawData.trades as Trade[] : (rawData.trades?.value ?? [])

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function itemById(id: string | undefined) { return rawData.items.find(i => i.id === id) }

export default function TradesPage() {
  const [query, setQuery] = useState("")
  const [trader, setTrader] = useState("all")

  const trades = allTrades
  const traders = useMemo(() => [...new Set(trades.map(t => t.trader).filter(Boolean) as string[])].sort(), [])

  const filtered = useMemo(() => {
    const q = normalizeText(query)
    return trades.filter(t => {
      if (trader !== "all" && t.trader !== trader) return false
      if (!q) return true
      const item = itemById(t.itemId)
      const costItem = itemById(t.cost?.itemId)
      return normalizeText(`${t.trader ?? ""} ${item?.name ?? ""} ${costItem?.name ?? ""} ${t.notes ?? ""}`).includes(q)
    })
  }, [query, trader, trades])

  return (
    <section className="utility-page">
      <h2>Trades</h2>
      <p>Consulte ofertas por trader, custo exigido, limite diário e item recebido usando o dataset offline.</p>

      <div className="utility-toolbar">
        <label className="utility-search">
          <span>Buscar trade</span>
          <input type="search" placeholder="Trader, item recebido ou custo..." autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="utility-stats">
        <article><span>Ofertas</span><strong>{trades.length}</strong></article>
        <article><span>Traders</span><strong>{traders.length}</strong></article>
        <article><span>Visíveis</span><strong>{filtered.length}</strong></article>
      </div>

      <div className="trade-filter-row" aria-label="Filtros de trader">
        <button type="button" className={trader === "all" ? "active" : ""} onClick={() => setTrader("all")} style={{ border: "1px solid var(--line-soft)", background: trader === "all" ? "var(--cyan-soft)" : "rgba(255,255,255,0.03)", color: trader === "all" ? "var(--cyan)" : "var(--muted)", cursor: "pointer", padding: "7px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}>
          Todos
        </button>
        {traders.map(t => (
          <button key={t} type="button" onClick={() => setTrader(t)} style={{ border: `1px solid ${trader === t ? "var(--cyan)" : "var(--line-soft)"}`, background: trader === t ? "var(--cyan-soft)" : "rgba(255,255,255,0.03)", color: trader === t ? "var(--cyan)" : "var(--muted)", cursor: "pointer", padding: "7px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}>
            {t}
          </button>
        ))}
      </div>

      <section className="utility-panel" style={{ marginTop: "18px" }}>
        <div className="utility-panel-head">
          <strong>Ofertas Disponíveis</strong>
          <small>{filtered.length} entradas</small>
        </div>
        <div className="utility-card-grid">
          {filtered.length === 0 ? (
            <article className="utility-card utility-card-empty"><p>Nenhuma trade encontrada.</p></article>
          ) : filtered.map((t, i) => {
            const item = itemById(t.itemId)
            const costItem = itemById(t.cost?.itemId)
            return (
              <article key={i} className="utility-card">
                <small>{t.trader ?? "Trader"}</small>
                <strong>{item?.name ?? t.itemId ?? "Item"}</strong>
                {costItem && (
                  <p className="trade-market-line">
                    Custo: {t.cost?.quantity ?? 1}× {costItem.name}
                  </p>
                )}
                {t.dailyLimit && <p style={{ color: "var(--muted)", fontSize: "12px" }}>Limite diário: {t.dailyLimit}</p>}
                {t.notes && <p style={{ color: "var(--faint)", fontSize: "12px" }}>{t.notes}</p>}
              </article>
            )
          })}
        </div>
      </section>
    </section>
  )
}


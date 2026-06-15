"use client"

import { useState, useMemo } from "react"
import arcData from "@/data/arc-data"
import "../../../styles/reciclagem.css"

type Item = { id: string; name: string; nameEn?: string; type?: string; rarity?: string; value?: number; isRecyclable?: boolean; recyclingOutput?: string; image?: string }

const data = arcData as unknown as { items: Item[]; bots: unknown[]; maps: unknown[]; trades: unknown[] }

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

export default function ReciclagemPage() {
  const [query, setQuery] = useState("")

  const recyclable = useMemo(() => data.items.filter(i => i.isRecyclable), [])
  const withOutput = useMemo(() => recyclable.filter(i => i.recyclingOutput), [recyclable])

  const q = normalizeText(query)
  const filtered = q ? recyclable.filter(i => normalizeText(`${i.name} ${i.nameEn ?? ""} ${i.recyclingOutput ?? ""}`).includes(q)) : recyclable

  return (
    <section className="utility-page">
      <h2>Reciclagem</h2>
      <p>Itens recicláveis, retorno descrito no dataset e pistas rápidas para farm de materiais.</p>

      <div className="utility-toolbar">
        <label className="utility-search">
          <span>Buscar reciclagem</span>
          <input type="search" placeholder="Item ou material obtido..." autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="utility-stats">
        <article><span>Itens</span><strong>{recyclable.length}</strong></article>
        <article><span>Saída clara</span><strong>{withOutput.length}</strong></article>
        <article><span>Visíveis</span><strong>{filtered.length}</strong></article>
      </div>

      <section className="utility-panel" style={{ marginTop: "18px" }}>
        <div className="utility-panel-head">
          <strong>Fontes Recicláveis</strong>
          <small>{filtered.length} entradas</small>
        </div>
        <div className="utility-card-grid">
          {filtered.length === 0 ? (
            <article className="utility-card utility-card-empty"><p style={{ color: "var(--muted)" }}>Nenhum item reciclável encontrado.</p></article>
          ) : filtered.map(item => (
            <article key={item.id} className="utility-card">
              <small>{item.type ?? "Item"} // {item.rarity ?? "?"}</small>
              <strong>{item.name}</strong>
              {item.recyclingOutput && <p>Saída: {item.recyclingOutput}</p>}
              {item.value != null && <p>Valor base: {formatNumber(item.value)}</p>}
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}


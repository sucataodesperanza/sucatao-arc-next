"use client"

import { useState, useMemo } from "react"
import arcData from "@/data/arc-data"
import "../../../styles/crafting.css"

type Item = { id: string; name: string; nameEn?: string; type?: string; rarity?: string; value?: number; isCraftable?: boolean; image?: string; description?: string; craftingMaterials?: string[] }

const data = arcData as unknown as { items: Item[]; bots: unknown[]; maps: unknown[]; trades: unknown[] }

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

export default function CraftingPage() {
  const [query, setQuery] = useState("")

  const craftable = useMemo(() => data.items.filter(i => i.isCraftable), [])
  const sources = useMemo(() => data.items.filter(i => !i.isCraftable && (i.type === "Raw Material" || i.type === "Topside Material" || i.type === "Refined Material" || i.type === "Material")), [])

  const q = normalizeText(query)
  const filteredCraftable = q ? craftable.filter(i => normalizeText(`${i.name} ${i.nameEn ?? ""} ${i.type ?? ""}`).includes(q)) : craftable
  const filteredSources = q ? sources.filter(i => normalizeText(`${i.name} ${i.nameEn ?? ""} ${i.type ?? ""}`).includes(q)) : sources

  return (
    <section className="utility-page">
      <h2>Crafting</h2>
      <p>Materiais, itens craftáveis e ligações de receita inferidas a partir do dataset offline.</p>

      <div className="utility-toolbar">
        <label className="utility-search">
          <span>Buscar crafting</span>
          <input type="search" placeholder="Item, material ou receita..." autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
      </div>

      <div className="utility-stats">
        <article><span>Craftáveis</span><strong>{craftable.length}</strong></article>
        <article><span>Materiais base</span><strong>{sources.length}</strong></article>
        <article><span>Visíveis</span><strong>{filteredCraftable.length + filteredSources.length}</strong></article>
      </div>

      <div className="utility-split">
        <section className="utility-panel">
          <div className="utility-panel-head">
            <strong>Materiais e Componentes</strong>
            <small>{filteredSources.length} entradas</small>
          </div>
          <div className="utility-card-grid">
            {filteredSources.length === 0 ? (
              <article className="utility-card utility-card-empty"><p style={{ color: "var(--muted)" }}>Nenhum material encontrado.</p></article>
            ) : filteredSources.map(item => (
              <article key={item.id} className="utility-card">
                <small>{item.type ?? "Material"}</small>
                <strong>{item.name}</strong>
                {item.value != null && <p>Valor: {formatNumber(item.value)}</p>}
              </article>
            ))}
          </div>
        </section>

        <section className="utility-panel">
          <div className="utility-panel-head">
            <strong>Itens Craftáveis</strong>
            <small>{filteredCraftable.length} entradas</small>
          </div>
          <div className="utility-card-grid">
            {filteredCraftable.length === 0 ? (
              <article className="utility-card utility-card-empty"><p style={{ color: "var(--muted)" }}>Nenhum item craftável encontrado.</p></article>
            ) : filteredCraftable.map(item => (
              <article key={item.id} className="utility-card">
                <small>{item.rarity ?? "Craftável"}</small>
                <strong>{item.name}</strong>
                {item.value != null && <p>Valor: {formatNumber(item.value)}</p>}
                {item.description && <p>{item.description}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}


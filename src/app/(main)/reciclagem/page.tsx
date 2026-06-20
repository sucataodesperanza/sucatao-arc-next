"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Recycle, Search } from "lucide-react"
import arcData from "@/data/arc-data"
import { getItemTypeLabel } from "@/lib/catalog"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/reciclagem.css"

type Item = {
  id: string; name: string; nameEn?: string; type?: string; rarity?: string
  value?: number; isRecyclable?: boolean; recyclingOutput?: string; image?: string
}

const data = arcData as unknown as { items: Item[] }
const recyclable = data.items.filter(i => i.isRecyclable)

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"]
const TYPES = [...new Set(recyclable.map(i => i.type).filter(Boolean) as string[])].sort()

const PANEL_KEY = "reciclagem-panel-open"

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function rarityColor(r?: string | null) { return rarityColors[r ?? ""] ?? rarityColors.Unknown }
function rarityLabel(r?: string | null) { return rarityMetaLabels[r ?? ""] ?? r ?? "?" }

export default function ReciclagemPage() {
  const [query, setQuery]   = useState("")
  const [rarity, setRarity] = useState("all")
  const [type, setType]     = useState("all")
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  const q = normalizeText(query)

  const filtered = useMemo(() => recyclable.filter(i => {
    if (rarity !== "all" && i.rarity !== rarity) return false
    if (type   !== "all" && i.type   !== type)   return false
    if (!q) return true
    return normalizeText(`${i.name} ${i.nameEn ?? ""} ${i.recyclingOutput ?? ""}`).includes(q)
  }), [q, rarity, type])

  const withOutput = useMemo(() => recyclable.filter(i => i.recyclingOutput).length, [])
  const totalValue = useMemo(() => recyclable.reduce((s, i) => s + (i.value ?? 0), 0), [])

  const topItems = useMemo(() =>
    [...recyclable].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5)
  , [])

  return (
    <div className={`reciclagem-page${panelOpen ? "" : " reciclagem-page--panel-closed"}`}>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="store-main">

          {/* Topbar */}
          <div className="reciclagem-topbar">
            <h1 className="page-title">Reciclagem</h1>
            <div className="reciclagem-stats-bar">
              <span><strong>{recyclable.length}</strong> recicláveis</span>
              <span><strong>{withOutput}</strong> com saída mapeada</span>
              <span><strong>{filtered.length}</strong> visíveis</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="catalog-filters">
            <label className="catalog-search">
              <Search size={14} />
              <input
                type="search"
                placeholder="Buscar item ou material obtido..."
                autoComplete="off"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </label>

            <select
              value={rarity}
              onChange={e => setRarity(e.target.value)}
              className="catalog-select"
            >
              <option value="all">Todas as raridades</option>
              {RARITIES.map(r => (
                <option key={r} value={r}>{rarityLabel(r)}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="catalog-select"
            >
              <option value="all">Todos os tipos</option>
              {TYPES.map(t => (
                <option key={t} value={t}>{getItemTypeLabel(t)}</option>
              ))}
            </select>
          </div>

          {/* Grid */}
          <section>
            <div className="store-section-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 950, color: "var(--paper)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <Recycle size={16} style={{ color: "var(--green)" }} />
                Itens Recicláveis
              </h2>
              <span style={{ fontSize: 12, color: "var(--gray-500)", fontWeight: 800 }}>
                {filtered.length} de {recyclable.length}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="catalog-empty">Nenhum item encontrado.</p>
            ) : (
              <div className="store-highlight-grid">
                {filtered.map(item => {
                  const color = rarityColor(item.rarity)
                  const imgSrc = item.image
                    ? (item.image.startsWith("http") ? item.image : `/${item.image}`)
                    : null
                  return (
                    <article
                      key={item.id}
                      className="store-highlight-card"
                      style={{ "--rarity-color": color } as React.CSSProperties}
                    >
                      <div className="store-highlight-media">
                        {imgSrc
                          ? <img src={imgSrc} alt={item.name} loading="lazy" />
                          : <div className="placeholder">{item.name[0]}</div>}
                        <span className="store-highlight-badge">{rarityLabel(item.rarity)}</span>
                      </div>
                      <div className="store-highlight-body">
                        <p className="store-highlight-type">{getItemTypeLabel(item.type)}</p>
                        <h3>{item.name}</h3>
                        {item.recyclingOutput && (
                          <div className="reciclagem-output">
                            <Recycle size={10} />
                            {item.recyclingOutput}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`}>
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          {/* Resumo */}
          <div className="reciclagem-panel-card">
            <p className="reciclagem-panel-head">Resumo</p>
            <div className="reciclagem-panel-stat">
              <span>Total recicláveis</span>
              <strong>{recyclable.length}</strong>
            </div>
            <div className="reciclagem-panel-stat">
              <span>Saída mapeada</span>
              <strong>{withOutput}</strong>
            </div>
            <div className="reciclagem-panel-stat">
              <span>Valor total estimado</span>
              <strong>{totalValue.toLocaleString("pt-BR")}</strong>
            </div>
            <div className="reciclagem-panel-stat">
              <span>Tipos diferentes</span>
              <strong>{TYPES.length}</strong>
            </div>
          </div>

          {/* Top mais valiosos */}
          <div className="reciclagem-panel-card" style={{ marginTop: 12 }}>
            <p className="reciclagem-panel-head">Mais valiosos</p>
            {topItems.map(item => {
              const imgSrc = item.image
                ? (item.image.startsWith("http") ? item.image : `/${item.image}`)
                : null
              return (
                <div key={item.id} className="reciclagem-top-item">
                  <div className="reciclagem-top-img">
                    {imgSrc
                      ? <img src={imgSrc} alt={item.name} />
                      : <span>{item.name[0]}</span>}
                  </div>
                  <div className="reciclagem-top-info">
                    <strong>{item.name}</strong>
                    <span style={{ color: rarityColor(item.rarity) }}>{rarityLabel(item.rarity)}</span>
                  </div>
                  <span className="reciclagem-top-value">
                    {(item.value ?? 0).toLocaleString("pt-BR")}
                  </span>
                </div>
              )
            })}
          </div>
        </aside>
      </div>

      <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)} aria-label="Abrir painel">
        <ChevronLeft size={16} />
        <span>Painel</span>
      </button>
    </div>
  )
}

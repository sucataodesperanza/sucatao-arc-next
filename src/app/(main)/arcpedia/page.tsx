"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Search, Shield } from "lucide-react"
import arcData from "@/data/arc-data"
import { ARC_THREAT_ORDER, getArcThreat, getArcThreatColor, getArcThreatLabel, getArcTypeLabel, type ArcEntry } from "@/lib/arcpedia"
import "../../../styles/itens.css"
import SidePanelUserHeader from "@/components/side-panel-user-header"

type LocalItem = { id: string; name: string }
const localItems = (arcData as unknown as { items: LocalItem[] }).items

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function itemNameForId(id: string) { return localItems.find(i => i.id === id)?.name ?? id }
function resolveImage(image?: string) {
  if (!image) return undefined
  if (image.startsWith("http") || image.startsWith("/")) return image
  return `/${image}`
}

const PANEL_KEY = "arcpedia-panel-open"

export default function ArcpediaPage() {
  const [arcs, setArcs] = useState<ArcEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [threat, setThreat] = useState("all")
  const [selected, setSelected] = useState<ArcEntry | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  useEffect(() => {
    fetch("/api/arcpedia")
      .then(res => res.json())
      .then(body => setArcs(body.arcs ?? []))
      .finally(() => setLoading(false))
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  const threats = useMemo(() => ARC_THREAT_ORDER.filter(t => arcs.some(a => getArcThreat(a.threat) === t)), [arcs])

  const filteredArcs = useMemo(() => {
    const q = normalizeText(query)
    return arcs.filter(arc => {
      if (threat !== "all" && getArcThreat(arc.threat) !== threat) return false
      if (!q) return true
      const drops = arc.drops.map(itemNameForId).join(" ")
      return normalizeText(`${arc.name} ${arc.type ?? ""} ${arc.description ?? ""} ${arc.weakness ?? ""} ${drops}`).includes(q)
    })
  }, [arcs, query, threat])

  const threatCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const arc of arcs) {
      const t = getArcThreat(arc.threat)
      counts[t] = (counts[t] ?? 0) + 1
    }
    return counts
  }, [arcs])

  return (
    <div className={`catalog-page${panelOpen ? "" : " arcpedia-page--panel-closed"}`}>
      <div className={`arcpedia-layout${panelOpen ? "" : " arcpedia-layout--no-panel"}`}>
        <div>
          <h1 className="page-title">Arcpedia</h1>

          <div className="catalog-filters">
            <label className="catalog-search">
              <Search size={14} />
              <input
                type="search"
                placeholder="Buscar por nome, tipo, fraqueza ou drop..."
                autoComplete="off"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </label>
            <div className="arcpedia-threat-filters">
              <button type="button" className={`arcpedia-threat-chip${threat === "all" ? " active" : ""}`} onClick={() => setThreat("all")}>
                Todas
              </button>
              {threats.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`arcpedia-threat-chip${threat === t ? " active" : ""}`}
                  style={threat === t ? { borderColor: getArcThreatColor(t), color: getArcThreatColor(t), background: `${getArcThreatColor(t)}22` } : undefined}
                  onClick={() => setThreat(t)}
                >
                  {getArcThreatLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div className="store-section-head">
            <h2>ARCs catalogados</h2>
            <span>Exibindo {filteredArcs.length} de {arcs.length}</span>
          </div>

          {loading ? (
            <p className="catalog-empty">Carregando Arcpedia...</p>
          ) : filteredArcs.length === 0 ? (
            <p className="catalog-empty">Nenhum ARC encontrado. Ajuste a busca ou os filtros.</p>
          ) : (
            <div className="store-highlight-grid store-items-grid">
              {filteredArcs.map(arc => {
                const t = getArcThreat(arc.threat)
                return (
                  <article
                    key={arc.id}
                    className="store-highlight-card arcpedia-arc-card"
                    style={{ "--rarity-color": getArcThreatColor(t) } as React.CSSProperties}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir detalhes de ${arc.name}`}
                    onClick={() => setSelected(arc)}
                    onKeyDown={e => { if (e.key === "Enter") setSelected(arc) }}
                  >
                    <div className="store-highlight-media arcpedia-card-media">
                      {arc.image
                        ? <img src={resolveImage(arc.image)} alt={arc.name} loading="lazy" />
                        : <div className="placeholder">{arc.name[0]}</div>}
                      {arc.threat && <span className="store-highlight-badge">{getArcThreatLabel(arc.threat)}</span>}
                    </div>
                    <div className="store-highlight-body">
                      <p className="store-highlight-type">{getArcTypeLabel(arc.type)}</p>
                      <h3>{arc.name}</h3>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel da Arcpedia">
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          <div className="store-side-card">
            <div className="store-side-head">
              <h2>Ameaças Detectadas</h2>
            </div>
            <div className="store-side-list">
              {ARC_THREAT_ORDER.filter(t => threatCounts[t]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`store-side-item store-side-item-button${threat === t ? " active" : ""}`}
                  style={threat === t ? { borderColor: getArcThreatColor(t) } as React.CSSProperties : undefined}
                  onClick={() => setThreat(threat === t ? "all" : t)}
                >
                  <Shield size={16} style={{ color: getArcThreatColor(t), flexShrink: 0 }} />
                  <div className="store-side-info">
                    <strong>{getArcThreatLabel(t)}</strong>
                    <span>{threatCounts[t]} ARC{(threatCounts[t] ?? 0) > 1 ? "s" : ""}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="store-side-card">
              <div className="store-side-head">
                <h2>Selecionado</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.image && (
                  <img
                    src={resolveImage(selected.image)}
                    alt={selected.name}
                    style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 120 }}
                  />
                )}
                <p style={{ margin: 0, color: getArcThreatColor(getArcThreat(selected.threat)), fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {getArcThreatLabel(selected.threat)}
                </p>
                <strong style={{ color: "var(--paper)", fontSize: 14 }}>{selected.name}</strong>
                {selected.weakness && (
                  <p style={{ margin: 0, color: "var(--gray-500)", fontSize: 12 }}>Fraqueza: {selected.weakness}</p>
                )}
                {selected.drops.length > 0 && (
                  <div className="catalog-modal-flags" style={{ marginTop: 4 }}>
                    {selected.drops.map(dropId => (
                      <Link key={dropId} href="/loja">{itemNameForId(dropId)}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <article className="catalog-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
            <button className="catalog-modal-close" type="button" aria-label="Fechar detalhe" onClick={() => setSelected(null)}>×</button>
            <div className="catalog-modal-media">
              {selected.image
                ? <img src={resolveImage(selected.image)} alt={selected.name} />
                : <div className="placeholder">{selected.name[0]}</div>}
            </div>
            <div className="catalog-modal-content">
              <p className="catalog-modal-kicker" style={{ color: getArcThreatColor(getArcThreat(selected.threat)) }}>
                Ameaça {getArcThreatLabel(selected.threat)} // {selected.type ?? "ARC unit"}
              </p>
              <h2>{selected.name}</h2>
              {selected.description && <p className="catalog-modal-description">{selected.description}</p>}
              {selected.weakness && (
                <div className="arcpedia-modal-section">
                  <p className="arcpedia-modal-label">Fraqueza</p>
                  <p className="catalog-modal-description">{selected.weakness}</p>
                </div>
              )}
              {selected.drops.length > 0 && (
                <div className="arcpedia-modal-section">
                  <p className="arcpedia-modal-label">Drops</p>
                  <div className="catalog-modal-flags" style={{ marginTop: 8 }}>
                    {selected.drops.map(dropId => (
                      <Link key={dropId} href="/loja">{itemNameForId(dropId)}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import arcData from "@/data/arc-data"
import { ARC_THREAT_ORDER, getArcThreat, getArcThreatColor, getArcThreatLabel, getArcTypeLabel, type ArcEntry } from "@/lib/arcpedia"

type LocalItem = { id: string; name: string }
const localItems = (arcData as unknown as { items: LocalItem[] }).items

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function itemNameForId(id: string) { return localItems.find(i => i.id === id)?.name ?? id }
function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

export default function ArcpediaPage() {
  const [arcs, setArcs] = useState<ArcEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [threat, setThreat] = useState("all")
  const [selected, setSelected] = useState<ArcEntry | null>(null)

  useEffect(() => {
    fetch("/api/arcpedia")
      .then(res => res.json())
      .then(body => setArcs(body.arcs ?? []))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="catalog-page">
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
                className="store-highlight-card"
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
                      <Link key={dropId} href="/itens">{itemNameForId(dropId)}</Link>
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

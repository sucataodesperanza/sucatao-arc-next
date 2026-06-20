"use client"

import { useState, useMemo } from "react"
import arcData from "@/data/arc-data"
import "../../../styles/arcs.css"

type Item = { id: string; name: string }
type Bot = {
  id: string; name: string; type?: string; threat?: string; weakness?: string
  description?: string; drops?: string[]; image?: string; xp?: number
}

const data = arcData as unknown as { items: Item[]; bots: Bot[]; maps: unknown[]; trades: unknown[] }

const arcThreatOrder = ["Low", "Medium", "High", "Apex", "Unknown"]
const threatColors: Record<string, string> = {
  Low: "#3df28b", Medium: "#ffd400", High: "#ff9d1b", Apex: "#ff6171", Unknown: "#8b99aa"
}

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function getArcThreat(bot: Bot) { return arcThreatOrder.includes(bot.threat ?? "") ? (bot.threat as string) : "Unknown" }
function itemNameForId(id: string) { return data.items.find(i => i.id === id)?.name ?? id }

export default function ArcsPage() {
  const [query, setQuery] = useState("")
  const [threat, setThreat] = useState("all")

  const threats = useMemo(() => arcThreatOrder.filter(t => data.bots.some(b => getArcThreat(b) === t)), [])

  const filteredBots = useMemo(() => {
    const q = normalizeText(query)
    return data.bots.filter(bot => {
      if (threat !== "all" && getArcThreat(bot) !== threat) return false
      if (!q) return true
      const drops = (bot.drops ?? []).map(id => itemNameForId(id)).join(" ")
      return normalizeText(`${bot.name} ${bot.type ?? ""} ${bot.threat ?? ""} ${bot.description ?? ""} ${bot.weakness ?? ""} ${drops}`).includes(q)
    })
  }, [query, threat])

  const uniqueDropCount = useMemo(() => new Set(filteredBots.flatMap(b => b.drops ?? [])).size, [filteredBots])

  return (
    <section className="arc-section" aria-labelledby="arcsTitle">
      <div className="section-head">
        <div>
          <p>Threat database <strong>{filteredBots.length}</strong> units indexed</p>
          <h2 id="arcsTitle">ARC intel expandida</h2>
        </div>
        <span>Drops clicáveis filtram o catálogo</span>
      </div>

      <div className="arc-toolbar">
        <label className="arc-search">
          <span>Buscar ARC</span>
          <input type="search" placeholder="Nome, classe, fraqueza ou drop..." autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className="arc-toolbar-stats">
          <article><span>Visíveis</span><strong>{filteredBots.length}</strong></article>
          <article><span>Drops únicos</span><strong>{uniqueDropCount}</strong></article>
        </div>
      </div>

      <div className="arc-threat-filters" aria-label="Filtros de ameaça">
        <button type="button" className={threat === "all" ? "active" : ""} onClick={() => setThreat("all")} style={{ border: "1px solid var(--line-soft)", background: threat === "all" ? "var(--cyan-soft)" : "rgba(255,255,255,0.03)", color: threat === "all" ? "var(--cyan)" : "var(--muted)", cursor: "pointer", padding: "8px 14px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}>
          Todos
        </button>
        {threats.map(t => (
          <button key={t} type="button" onClick={() => setThreat(t)} style={{ border: `1px solid ${threat === t ? threatColors[t] : "var(--line-soft)"}`, background: threat === t ? `${threatColors[t]}22` : "rgba(255,255,255,0.03)", color: threat === t ? threatColors[t] : "var(--muted)", cursor: "pointer", padding: "8px 14px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="arc-grid">
        {filteredBots.map(bot => {
          const drops = (bot.drops ?? []).slice(0, 8)
          const threatColor = threatColors[getArcThreat(bot)]
          return (
            <article key={bot.id} className="arc-card">
              <div className="arc-media">
                {bot.image
                  ? <img src={`/${bot.image}`} alt={bot.name} loading="lazy" />
                  : <div className="placeholder">{bot.name[0]}</div>}
              </div>
              <div className="arc-body">
                <div className="arc-title-row">
                  <div>
                    <small>{bot.type ?? "ARC unit"}</small>
                    <h3>{bot.name}</h3>
                  </div>
                  {bot.threat && <span className="arc-threat-badge" style={{ color: threatColor, border: `1px solid ${threatColor}44`, background: `${threatColor}11` }}>{bot.threat}</span>}
                </div>
                {bot.weakness && <p className="arc-weakness"><em>Fraqueza:</em> {bot.weakness}</p>}
                {bot.description && <p className="arc-description">{bot.description}</p>}
                {drops.length > 0 && (
                  <div className="arc-drops">
                    <small>Drops</small>
                    <div className="arc-drop-list">
                      {drops.map(dropId => (
                        <a key={dropId} href="/loja" className="arc-drop-chip" title={itemNameForId(dropId)}>
                          {itemNameForId(dropId)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          )
        })}
        {filteredBots.length === 0 && (
          <article className="arc-card arc-empty-card">
            <div className="arc-body"><p style={{ color: "var(--muted)" }}>Nenhum ARC encontrado para os filtros atuais.</p></div>
          </article>
        )}
      </div>
    </section>
  )
}


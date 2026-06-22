"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Archive, ChevronLeft, ChevronRight, Coins, HelpCircle, Package, Plus, Search, ShoppingBag, Star, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemTypeLabel } from "@/lib/catalog"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import type { InventoryEntry } from "@/app/api/inventory/route"
import "../../../styles/inventario.css"

const PANEL_KEY   = "inventario-panel-open"
const ITEMS_PER_PAGE = 24

const RARITY_COLORS: Record<string, string> = rarityColors

function rarityLabel(r?: string | null) { return rarityMetaLabels[r ?? ""] ?? r ?? "?" }

function rarityKey(r?: string | null) {
  if (!r) return "Outros"
  if (r === "Common")   return "Comum"
  if (r === "Uncommon") return "Incomum"
  if (r === "Rare")     return "Raro"
  if (r === "Epic")     return "Épico"
  if (r === "Legendary") return "Lendário"
  return "Outros"
}

function itemCategory(type?: string | null): string {
  if (!type) return "Outros"
  const t = type.toLowerCase()
  if (["weapon", "hand cannon", "assault rifle", "shotgun", "sniper rifle", "smg", "lmg", "special"].some(w => t.includes(w))) return "Armas"
  if (["equipment", "shield", "armor", "deployable"].some(w => t.includes(w))) return "Equipamentos"
  if (["material", "nature"].some(w => t.includes(w))) return "Recursos"
  if (["modification", "blueprint", "component", "augment"].some(w => t.includes(w))) return "Componentes"
  return "Outros"
}

const CATEGORIES = ["Todos", "Armas", "Equipamentos", "Recursos", "Componentes", "Outros"]

// ── Donut chart ────────────────────────────────────────────────────────────

function DonutChart({ entries }: { entries: InventoryEntry[] }) {
  const r = 58; const cx = 70; const cy = 70
  const circumference = 2 * Math.PI * r
  const gap = 3

  const byRarity = useMemo(() => {
    const total = entries.reduce((s, e) => s + e.quantity, 0)
    const segments = [
      { label: "Comum",    color: "#8b99aa", count: 0 },
      { label: "Raro",     color: "#5fa8ff", count: 0 },
      { label: "Épico",    color: "#b477ff", count: 0 },
      { label: "Lendário", color: "#ffd400", count: 0 },
      { label: "Outros",   color: "#566171", count: 0 },
    ]
    for (const e of entries) {
      const rk = rarityKey(e.catalog_items?.rarity)
      const idx = ["Comum","Raro","Épico","Lendário"].indexOf(rk)
      segments[idx === -1 ? 4 : idx].count += e.quantity
    }
    return { segments, total }
  }, [entries])

  let offset = 0
  return (
    <div className="inventario-donut-chart">
      <svg viewBox="0 0 140 140" width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        {byRarity.segments.map(seg => {
          const len = byRarity.total ? (seg.count / byRarity.total) * circumference : 0
          const el = (
            <circle key={seg.label} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="18"
              strokeDasharray={`${Math.max(0, len - gap)} ${circumference - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="inventario-donut-center">
        <strong>{byRarity.total}</strong>
        <span>itens</span>
      </div>
    </div>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [points, setPoints]   = useState<number | null>(null)
  const [entries, setEntries] = useState<InventoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("geral")
  const [activeCat, setActiveCat] = useState("Todos")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("points").eq("id", user.id).single()
        .then(({ data }) => { if (data) setPoints(data.points ?? 0) })
    })
  }, [])

  useEffect(() => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then(d => setEntries(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  // Derivados
  const totalQty     = entries.reduce((s, e) => s + e.quantity, 0)
  const rarosQty     = entries.filter(e => e.catalog_items?.rarity === "Rare").reduce((s, e) => s + e.quantity, 0)
  const epicosQty    = entries.filter(e => e.catalog_items?.rarity === "Epic").reduce((s, e) => s + e.quantity, 0)
  const lendariosQty = entries.filter(e => e.catalog_items?.rarity === "Legendary").reduce((s, e) => s + e.quantity, 0)
  const valorTotal   = entries.reduce((s, e) => s + (e.catalog_items?.value ?? 0) * e.quantity, 0)

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: totalQty }
    for (const e of entries) {
      const cat = itemCategory(e.catalog_items?.item_type)
      counts[cat] = (counts[cat] ?? 0) + e.quantity
    }
    return counts
  }, [entries, totalQty])

  const topItems = useMemo(() =>
    [...entries].sort((a, b) => (b.catalog_items?.value ?? 0) - (a.catalog_items?.value ?? 0)).slice(0, 5)
  , [entries])

  const rarityLegend = useMemo(() => [
    { label: "Comum",    color: "#8b99aa", count: entries.filter(e => e.catalog_items?.rarity === "Common").reduce((s, e) => s + e.quantity, 0) },
    { label: "Raro",     color: "#5fa8ff", count: rarosQty },
    { label: "Épico",    color: "#b477ff", count: epicosQty },
    { label: "Lendário", color: "#ffd400", count: lendariosQty },
    { label: "Outros",   color: "#566171", count: entries.filter(e => !["Common","Rare","Epic","Legendary"].includes(e.catalog_items?.rarity ?? "")).reduce((s, e) => s + e.quantity, 0) },
  ], [entries, rarosQty, epicosQty, lendariosQty])

  const filteredEntries = useMemo(() => activeCat === "Todos"
    ? entries
    : entries.filter(e => itemCategory(e.catalog_items?.item_type) === activeCat)
  , [entries, activeCat])

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / ITEMS_PER_PAGE))
  const pageEntries = filteredEntries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className={`inventario-page${panelOpen ? "" : " inventario-page--panel-closed"}`}>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="store-main">

          {/* Topbar */}
          <div className="mapas-topbar">
            <h1 className="page-title">Inventário</h1>
            <div className="inventario-carteira">
              <span className="inventario-carteira-label">Carteira</span>
              <div className="inventario-carteira-value">
                <Coins size={18} />
                {points !== null ? points.toLocaleString("pt-BR") : "—"}
              </div>
              <button type="button" className="inventario-carteira-add" title="Adicionar pontos">
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="inventario-tabs">
            {[
              { key: "geral",     label: "Visão Geral" },
              { key: "itens",     label: "Itens" },
              { key: "historico", label: "Histórico" },
              { key: "colecoes",  label: "Coleções" },
            ].map(tab => (
              <button key={tab.key} type="button"
                className={`inventario-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >{tab.label}</button>
            ))}
          </div>

          {activeTab !== "geral" ? (
            <p className="catalog-empty" style={{ marginTop: 48 }}>Em breve.</p>
          ) : loading ? (
            <p className="catalog-empty" style={{ marginTop: 48 }}>Carregando inventário...</p>
          ) : entries.length === 0 ? (
            <div style={{ marginTop: 48, textAlign: "center" }}>
              <p className="catalog-empty">Seu inventário está vazio.</p>
              <Link href="/loja" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--yellow)", fontWeight: 950, fontSize: 13, textTransform: "uppercase" }}>
                Ir para a loja
              </Link>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="inventario-stats">
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--total"><Package size={18} /></div>
                  <div className="inventario-stat-body">
                    <strong>{totalQty.toLocaleString("pt-BR")}</strong>
                    <span>Itens totais</span>
                    <p className="inventario-stat-sub">{entries.length} itens únicos</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--raro"><span style={{ fontSize: 14, fontWeight: 950, color: "#5fa8ff" }}>R</span></div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#5fa8ff" }}>{rarosQty}</strong>
                    <span>Raros</span>
                    <p className="inventario-stat-sub">{totalQty ? Math.round((rarosQty / totalQty) * 100) : 0}% do total</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--epico"><span style={{ fontSize: 14, fontWeight: 950, color: "#b477ff" }}>É</span></div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#b477ff" }}>{epicosQty}</strong>
                    <span>Épicos</span>
                    <p className="inventario-stat-sub">{totalQty ? Math.round((epicosQty / totalQty) * 100) : 0}% do total</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--lend"><span style={{ fontSize: 14, fontWeight: 950, color: "#ffd400" }}>L</span></div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#ffd400" }}>{lendariosQty}</strong>
                    <span>Lendários</span>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--valor"><Coins size={18} /></div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "var(--green)" }}>{valorTotal.toLocaleString("pt-BR")}</strong>
                    <span>Valor estimado</span>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="inventario-filters-row">
                <span className="inventario-filters-label">Filtros</span>
                <label className="inventario-search">
                  <Search size={14} />
                  <input type="search" placeholder="Buscar item..." autoComplete="off" />
                </label>
                <select className="inventario-select">
                  <option>Todas as raridades</option>
                  {["Comum","Incomum","Raro","Épico","Lendário"].map(r => <option key={r}>{r}</option>)}
                </select>
                <select className="inventario-select">
                  <option>Ordenar: Mais recentes</option>
                  <option>Maior valor</option>
                  <option>Raridade</option>
                </select>
              </div>

              {/* Category pills */}
              <div className="inventario-cats">
                {CATEGORIES.map(cat => (
                  <button key={cat} type="button"
                    className={`inventario-cat${activeCat === cat ? " active" : ""}`}
                    onClick={() => { setActiveCat(cat); setPage(1) }}
                  >
                    {cat} ({catCounts[cat] ?? 0})
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div className="inventario-grid">
                {pageEntries.map(entry => {
                  const item  = entry.catalog_items
                  const rk    = rarityKey(item?.rarity)
                  const color = RARITY_COLORS[item?.rarity ?? ""] ?? "#566171"
                  return (
                    <div key={entry.id} className="inventario-item-card" style={{ "--item-color": color } as React.CSSProperties}>
                      <span className="inventario-item-rarity-badge">{rk}</span>
                      <span className="inventario-item-qty">x{entry.quantity}</span>
                      <div className="inventario-item-media">
                        {item?.icon_url
                          ? <img src={item.icon_url} alt={item.name} loading="lazy" />
                          : item?.name[0]}
                      </div>
                      <div className="inventario-item-body">
                        <p className="inventario-item-name">{item?.name}</p>
                        <p className="inventario-item-cat">{getItemTypeLabel(item?.item_type)}</p>
                        <div className="inventario-item-value">
                          <Coins size={12} />
                          {(item?.value ?? 0).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="inventario-pagination">
                  <span className="inventario-pagination-info">
                    Mostrando {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredEntries.length)} de {filteredEntries.length} itens
                  </span>
                  <div className="inventario-pages">
                    <button type="button" className="inventario-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                      <button key={n} type="button" className={`inventario-page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                    ))}
                    <button type="button" className="inventario-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`}>
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          <div className="inventario-donut-wrap">
            <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)", alignSelf: "flex-start" }}>
              Resumo do Inventário
            </p>
            <DonutChart entries={entries} />
            <div className="inventario-legend">
              {rarityLegend.map(({ label, color, count }) => (
                <div key={label} className="inventario-legend-row">
                  <span className="inventario-legend-label">
                    <span className="inventario-legend-dot" style={{ background: color }} />
                    {label}
                  </span>
                  <span className="inventario-legend-count">
                    {count} ({totalQty ? Math.round((count / totalQty) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="inventario-valiosos">
            <div className="inventario-panel-head">
              <h3>Mais valiosos</h3>
            </div>
            {topItems.map(e => {
              const item = e.catalog_items
              return (
                <div key={e.id} className="inventario-valioso-row">
                  <div className="inventario-valioso-img"
                    style={{ background: `color-mix(in srgb, ${RARITY_COLORS[item?.rarity ?? ""] ?? "#566171"} 15%, rgba(255,255,255,0.03))`, color: RARITY_COLORS[item?.rarity ?? ""] ?? "#566171" }}>
                    {item?.icon_url
                      ? <img src={item.icon_url} alt={item.name} style={{ width: 26, height: 26, objectFit: "contain" }} />
                      : item?.name[0]}
                  </div>
                  <div className="inventario-valioso-info">
                    <strong>{item?.name}</strong>
                    <span style={{ color: RARITY_COLORS[item?.rarity ?? ""] ?? "#566171" }}>{rarityLabel(item?.rarity)}</span>
                  </div>
                  <span className="inventario-valioso-value">{(item?.value ?? 0).toLocaleString("pt-BR")}</span>
                </div>
              )
            })}
          </div>

          <div className="inventario-acoes">
            <div className="inventario-panel-head"><h3>Ações rápidas</h3></div>
            <div className="inventario-acoes-grid">
              <Link href="/loja" className="inventario-acao">
                <div className="inventario-acao-icon" style={{ background: "rgba(255,97,113,0.12)", color: "var(--red)" }}><Truck size={14} /></div>
                <strong>Entregar Itens</strong><span>Vender para o Sucatão</span>
              </Link>
              <Link href="/loja" className="inventario-acao">
                <div className="inventario-acao-icon" style={{ background: "rgba(95,168,255,0.12)", color: "var(--blue)" }}><ShoppingBag size={14} /></div>
                <strong>Ver Loja</strong><span>Gastar Sucatas</span>
              </Link>
              <button type="button" className="inventario-acao" style={{ border: "1px solid var(--stroke)" }}>
                <div className="inventario-acao-icon" style={{ background: "rgba(61,242,139,0.10)", color: "var(--green)" }}><Archive size={14} /></div>
                <strong>Transferir</strong><span>Mover itens</span>
              </button>
              <button type="button" className="inventario-acao" style={{ border: "1px solid var(--stroke)" }}>
                <div className="inventario-acao-icon" style={{ background: "rgba(255,212,0,0.10)", color: "var(--yellow)" }}><Star size={14} /></div>
                <strong>Favoritos</strong><span>Ver favoritos</span>
              </button>
            </div>
          </div>

          <div className="inventario-help">
            <div className="inventario-help-icon"><HelpCircle size={18} /></div>
            <div className="inventario-help-body">
              <strong>Precisa de ajuda?</strong>
              <span>Acesse nossa Central de Suporte</span>
            </div>
            <ChevronRight size={16} style={{ color: "var(--gray-500)", marginLeft: "auto", flexShrink: 0 }} />
          </div>
        </aside>
      </div>

      <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)} aria-label="Abrir painel">
        <ChevronLeft size={16} /><span>Painel</span>
      </button>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Archive, ChevronLeft, ChevronRight, Coins, HelpCircle, Package, Plus, Search, ShoppingBag, Star, Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getItemTypeLabel } from "@/lib/catalog"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import type { InventoryEntry } from "@/app/api/inventory/route"
import type { HistoryEntry } from "@/app/api/inventory/history/route"
import { nextPackPointsPrice, nextPackBrlPrice } from "@/lib/inventory-pricing"
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
  const [entries, setEntries]       = useState<InventoryEntry[]>([])
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [capacity, setCapacity] = useState(100)
  const [loading, setLoading]   = useState(true)
  const [expanding, setExpanding] = useState(false)
  const [expandMsg, setExpandMsg] = useState("")
  const [panelOpen, setPanelOpen] = useState(true)
  const [activeTab, setActiveTab]   = useState("geral")
  const [activeCat, setActiveCat]   = useState("Todos")
  const [page, setPage]             = useState(1)

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

  const [reconciling, setReconciling] = useState(false)

  async function loadInventory() {
    const res = await fetch("/api/inventory")
    const d   = await res.json().catch(() => ({}))
    setEntries(d.items ?? [])
    setCapacity(d.capacity ?? 100)
    return d.items ?? []
  }

  useEffect(() => {
    setLoading(true)
    loadInventory()
      .then(async items => {
        // Se inventário vazio, tenta reconciliar automaticamente com compras pagas
        if (items.length === 0) {
          await fetch("/api/inventory/reconcile", { method: "POST" })
          await loadInventory()
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab !== "historico") return
    setLoadingHistory(true)
    fetch("/api/inventory/history")
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [activeTab])

  async function reconcileInventory() {
    setReconciling(true)
    const res = await fetch("/api/inventory/reconcile", { method: "POST" })
    const body = await res.json().catch(() => ({}))
    await loadInventory()
    setReconciling(false)
    if (res.ok && body.items_synced > 0) {
      setExpandMsg(`✓ ${body.items_synced} item(ns) recuperado(s) das suas compras!`)
      setTimeout(() => setExpandMsg(""), 5000)
    }
  }

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  async function expandInventory(mode: "points" | "cash") {
    setExpanding(true)
    setExpandMsg("")
    const res = await fetch("/api/inventory/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    })
    const body = await res.json().catch(() => ({}))
    setExpanding(false)
    if (res.ok) {
      if (mode === "points") {
        setCapacity(body.new_capacity)
        setPoints(body.points_left)
        setExpandMsg(`✓ +25 slots adicionados! Capacidade: ${body.new_capacity}`)
      } else {
        setExpandMsg("PIX gerado — em breve disponível nesta tela.")
      }
      setTimeout(() => setExpandMsg(""), 5000)
    } else {
      setExpandMsg(body.error ?? "Erro ao expandir.")
      setTimeout(() => setExpandMsg(""), 5000)
    }
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

  const filteredEntries = useMemo(() =>
    activeCat === "Todos" ? entries : entries.filter(e => itemCategory(e.catalog_items?.item_type) === activeCat)
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
              { key: "historico", label: "Histórico" },
              { key: "colecoes",  label: "Coleções" },
            ].map(tab => (
              <button key={tab.key} type="button"
                className={`inventario-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >{tab.label}</button>
            ))}
          </div>

          {activeTab === "historico" ? (
            /* ── Aba Histórico ── */
            loadingHistory ? (
              <p className="catalog-empty" style={{ marginTop: 48 }}>Carregando histórico...</p>
            ) : history.length === 0 ? (
              <p className="catalog-empty" style={{ marginTop: 48 }}>Nenhuma aquisição registrada ainda.</p>
            ) : (
              <div className="inventario-history">
                {history.map((entry, idx) => {
                  const item  = entry.catalog_items
                  const color = RARITY_COLORS[item?.rarity ?? ""] ?? "#566171"
                  const date  = new Date(entry.acquired_at)
                  const isNewDay = idx === 0 || new Date(history[idx - 1].acquired_at).toDateString() !== date.toDateString()

                  const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
                    points:    { label: "Compra com pontos", color: "var(--yellow)" },
                    pix:       { label: "Compra via PIX",    color: "var(--green)" },
                    trade:     { label: "Trade",             color: "var(--blue)" },
                    reconcile: { label: "Sincronização",     color: "var(--gray-500)" },
                    admin:     { label: "Admin",             color: "var(--red)" },
                    unknown:   { label: "Desconhecido",      color: "var(--gray-500)" },
                  }
                  const src = SOURCE_LABELS[entry.source] ?? SOURCE_LABELS.unknown

                  return (
                    <div key={entry.id}>
                      {isNewDay && (
                        <p className="inventario-history-day">
                          {date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                      )}
                      <div className="inventario-history-row">
                        <div className="inventario-history-icon" style={{ background: `color-mix(in srgb, ${color} 12%, rgba(255,255,255,0.03))`, borderColor: `color-mix(in srgb, ${color} 25%, transparent)` }}>
                          {item?.icon_url
                            ? <img src={item.icon_url} alt={item?.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            : <span style={{ color, fontSize: 16, fontWeight: 950 }}>{item?.name?.[0]}</span>}
                        </div>
                        <div className="inventario-history-info">
                          <strong>{item?.name}</strong>
                          <span>{getItemTypeLabel(item?.item_type)}</span>
                        </div>
                        <div className="inventario-history-meta">
                          <span className="inventario-history-source" style={{ color: src.color, borderColor: `color-mix(in srgb, ${src.color} 30%, transparent)`, background: `color-mix(in srgb, ${src.color} 8%, transparent)` }}>
                            {src.label}
                          </span>
                          <span className="inventario-history-qty" style={{ color }}>+{entry.quantity}</span>
                          <span className="inventario-history-time">
                            {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : activeTab !== "geral" ? (
            <p className="catalog-empty" style={{ marginTop: 48 }}>Em breve.</p>
          ) : loading ? (
            <p className="catalog-empty" style={{ marginTop: 48 }}>Carregando inventário...</p>
          ) : entries.length === 0 ? (
            <div style={{ marginTop: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <p className="catalog-empty">Seu inventário está vazio.</p>
              <button
                type="button"
                onClick={reconcileInventory}
                disabled={reconciling}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "1px solid rgba(95,168,255,0.35)", borderRadius: 8, background: "rgba(95,168,255,0.08)", color: "var(--blue)", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 950, textTransform: "uppercase", opacity: reconciling ? 0.6 : 1 }}
              >
                {reconciling ? "Sincronizando..." : "↻ Sincronizar com compras"}
              </button>
              <Link href="/loja" style={{ color: "var(--yellow)", fontWeight: 950, fontSize: 13, textTransform: "uppercase" }}>
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

          {/* Capacidade do inventário */}
          {(() => {
            const extraSlots  = capacity - 100
            const ptsPrice    = nextPackPointsPrice(extraSlots)
            const brlPrice    = nextPackBrlPrice(extraSlots)
            const usedSlots   = entries.reduce((s, e) => s + e.quantity, 0)
            const pct         = Math.min(100, Math.round((usedSlots / capacity) * 100))
            const isFull      = usedSlots >= capacity
            return (
              <div className="inventario-panel-card" style={{ marginTop: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)" }}>
                    Capacidade do Inventário
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 950, color: isFull ? "var(--red)" : "var(--paper-dim)" }}>
                    {usedSlots}/{capacity}
                  </span>
                </div>

                {/* Barra de uso */}
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${pct}%`,
                    background: pct >= 90 ? "var(--red)" : pct >= 70 ? "var(--yellow)" : "var(--green)",
                    transition: "width 0.4s ease",
                  }} />
                </div>

                {isFull && (
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--red)", fontWeight: 800 }}>
                    Inventário cheio! Expanda para adicionar mais itens.
                  </p>
                )}

                {expandMsg && (
                  <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, color: expandMsg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>
                    {expandMsg}
                  </p>
                )}

                {/* Botões de compra */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    type="button"
                    disabled={expanding || (points ?? 0) < ptsPrice}
                    onClick={() => expandInventory("points")}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", border: "1px solid rgba(255,212,0,0.3)",
                      borderRadius: 8, background: "rgba(255,212,0,0.06)", cursor: "pointer",
                      font: "inherit", opacity: expanding || (points ?? 0) < ptsPrice ? 0.5 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 850, color: "var(--paper)" }}>
                      +25 slots
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 950, color: "var(--yellow)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Coins size={12} />
                      {ptsPrice.toLocaleString("pt-BR")} pts
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={expanding}
                    onClick={() => expandInventory("cash")}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", border: "1px solid rgba(61,242,139,0.25)",
                      borderRadius: 8, background: "rgba(61,242,139,0.05)", cursor: "pointer",
                      font: "inherit", opacity: expanding ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 850, color: "var(--paper)" }}>
                      +25 slots
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 950, color: "var(--green)" }}>
                      R$ {brlPrice},00 via PIX
                    </span>
                  </button>
                </div>
              </div>
            )
          })()}

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

          {/* Botão de sincronização sempre visível */}
          <button
            type="button"
            onClick={reconcileInventory}
            disabled={reconciling}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", marginTop: 10, padding: "10px 14px",
              border: "1px solid rgba(95,168,255,0.3)", borderRadius: 8,
              background: "rgba(95,168,255,0.06)", color: "var(--blue)",
              cursor: "pointer", font: "inherit", fontSize: 11, fontWeight: 950,
              textTransform: "uppercase", letterSpacing: "0.05em",
              opacity: reconciling ? 0.6 : 1, transition: "opacity 0.15s",
            }}
          >
            {reconciling ? "Sincronizando..." : "↻ Sincronizar com compras"}
          </button>

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

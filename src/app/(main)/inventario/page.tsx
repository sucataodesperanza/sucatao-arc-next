"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Archive, CalendarClock, ChevronLeft, ChevronRight, Clock, Coins, HelpCircle, Package, Plus, Search, ShoppingBag, Star, Truck, X } from "lucide-react"
import { calcSlotsNeeded, ITEMS_PER_SLOT } from "@/lib/vault-stacking"
import type { CatalogItem } from "@/lib/catalog"
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
  const [userId, setUserId] = useState<string | null | undefined>(undefined)
  const [points, setPoints]   = useState<number | null>(null)
  const [entries, setEntries]       = useState<InventoryEntry[]>([])
  const [history, setHistory]       = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [capacity, setCapacity] = useState(100)
  const [loading, setLoading]   = useState(true)
  const [expanding, setExpanding] = useState(false)
  const [expandMsg, setExpandMsg] = useState("")
  const [panelOpen, setPanelOpen] = useState(false)
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
      if (!user) { setUserId(null); setLoading(false); return }
      setUserId(user.id)
      supabase.from("profiles").select("points").eq("id", user.id).single()
        .then(({ data }) => { if (data) setPoints(data.points ?? 0) })
    })
  }, [])

  type VaultStatus = {
    expedition: { id: string; name: string; ends_at: string; slots_per_pack: number }
    packs_count: number
    total_slots: number
  }
  type DepositItem = { id?: string; name: string; rarity: string; quantity: number }
  type Deposit = {
    id: string; type: "deposit" | "pickup"; items: DepositItem[]
    slots_used: number; preferred_at: string | null; notes: string | null
    status: "scheduled" | "in_storage" | "returned" | "cancelled"
    admin_notes: string | null; created_at: string
  }
  const [vaultStatus, setVaultStatus]       = useState<VaultStatus | null>(null)
  const [deposits, setDeposits]             = useState<Deposit[]>([])
  const [depositModal, setDepositModal]     = useState<"deposit" | "pickup" | null>(null)
  const [depositItems, setDepositItems]     = useState<DepositItem[]>([])
  const [depositSearch, setDepositSearch]   = useState("")
  const [depositCatalog, setDepositCatalog] = useState<CatalogItem[]>([])
  const [depositCatalogLoaded, setDepositCatalogLoaded] = useState(false)
  const [depositDate, setDepositDate]             = useState("")
  const [depositTimes, setDepositTimes]           = useState<string[]>([])
  const [depositTimesLoading, setDepositTimesLoading] = useState(false)
  const [depositMaxDate, setDepositMaxDate]       = useState("")
  const [depositSelectedTime, setDepositSelectedTime] = useState("")
  const [depositNotes, setDepositNotes]           = useState("")
  const [depositLoading, setDepositLoading]       = useState(false)
  const [depositMsg, setDepositMsg]               = useState("")

  const [reconciling, setReconciling] = useState(false)

  async function loadInventory() {
    const res = await fetch("/api/inventory")
    const d   = await res.json().catch(() => ({}))
    setEntries(d.items ?? [])
    setCapacity(d.capacity ?? 100)
    return d.items ?? []
  }

  useEffect(() => {
    if (userId === undefined || userId === null) return
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
  }, [userId])

  useEffect(() => {
    if (userId === undefined || userId === null) return
    fetch("/api/expeditions/vault-status")
      .then(r => r.json())
      .then(d => setVaultStatus(d.vault ?? null))
      .catch(() => {})
    loadDeposits()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!depositModal) return
    if (!depositCatalogLoaded) {
      fetch("/api/catalog")
        .then(r => r.json())
        .then(d => { setDepositCatalog(d.items ?? []); setDepositCatalogLoaded(true) })
        .catch(() => {})
    }
    if (!depositMaxDate) {
      fetch("/api/expeditions/vault-deposit/available-times?date=" + new Date().toISOString().slice(0, 10))
        .then(r => r.json())
        .then(d => { if (d.maxDate) setDepositMaxDate(d.maxDate) })
        .catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositModal])

  useEffect(() => {
    if (activeTab !== "historico") return
    setLoadingHistory(true)
    fetch("/api/inventory/history")
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [activeTab])

  async function loadDeposits() {
    const res = await fetch("/api/expeditions/vault-deposit")
    const d   = await res.json().catch(() => ({}))
    setDeposits(d.deposits ?? [])
  }

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
  const valorTotal   = entries.reduce((s, e) => s + (e.catalog_items?.price_cash ?? e.catalog_items?.value ?? 0) * e.quantity, 0)

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: totalQty }
    for (const e of entries) {
      const cat = itemCategory(e.catalog_items?.item_type)
      counts[cat] = (counts[cat] ?? 0) + e.quantity
    }
    return counts
  }, [entries, totalQty])

  const topItems = useMemo(() =>
    [...entries].sort((a, b) => (b.catalog_items?.price_cash ?? b.catalog_items?.value ?? 0) - (a.catalog_items?.price_cash ?? a.catalog_items?.value ?? 0)).slice(0, 5)
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

  const slotsForModal = useMemo(() => calcSlotsNeeded(depositItems), [depositItems])

  function openDepositModal(type: "deposit" | "pickup") {
    setDepositItems([])
    setDepositSearch("")
    setDepositDate("")
    setDepositTimes([])
    setDepositSelectedTime("")
    setDepositMaxDate("")
    setDepositNotes("")
    setDepositMsg("")
    setDepositModal(type)
  }

  async function loadDepositTimes(date: string) {
    setDepositDate(date)
    setDepositSelectedTime("")
    if (!date) { setDepositTimes([]); return }
    setDepositTimesLoading(true)
    const res = await fetch(`/api/expeditions/vault-deposit/available-times?date=${date}`)
    const d   = await res.json().catch(() => ({}))
    setDepositTimes(d.times ?? [])
    if (!depositMaxDate && d.maxDate) setDepositMaxDate(d.maxDate)
    setDepositTimesLoading(false)
  }

  function addDepositItem(item: CatalogItem) {
    setDepositItems(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: item.id, name: item.name, rarity: item.rarity ?? "Common", quantity: 1 }]
    })
  }

  function changeDepositQty(id: string | undefined, name: string, delta: number) {
    setDepositItems(prev => prev.map(i => {
      if (i.id === id && i.name === name) return { ...i, quantity: Math.max(1, i.quantity + delta) }
      return i
    }))
  }

  function removeDepositItem(id: string | undefined, name: string) {
    setDepositItems(prev => prev.filter(i => !(i.id === id && i.name === name)))
  }

  async function handleDepositSubmit() {
    if (depositItems.length === 0) { setDepositMsg("Adicione pelo menos 1 item."); return }
    const preferred_at = depositDate && depositSelectedTime
      ? new Date(`${depositDate}T${depositSelectedTime}:00`).toISOString()
      : null
    setDepositLoading(true)
    setDepositMsg("")
    const res = await fetch("/api/expeditions/vault-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type:         depositModal,
        items:        depositItems.map(({ name, rarity, quantity }) => ({ name, rarity, quantity })),
        preferred_at,
        notes:        depositNotes || null,
      }),
    })
    const d = await res.json().catch(() => ({}))
    setDepositLoading(false)
    if (res.ok) {
      setDepositMsg("Agendamento criado! O Sucatão entrará em contato via Discord.")
      await loadDeposits()
      setTimeout(() => setDepositModal(null), 2500)
    } else {
      setDepositMsg(d.error ?? "Erro ao criar agendamento.")
    }
  }

  const depositSearchLower = depositSearch.toLowerCase()
  const depositCatalogFiltered = depositSearch.length >= 2
    ? depositCatalog.filter(i => i.name.toLowerCase().includes(depositSearchLower) || (i.rarity ?? "").toLowerCase().includes(depositSearchLower))
    : depositCatalog.slice(0, 30)

  const DEPOSIT_STATUS: Record<string, { label: string; color: string }> = {
    scheduled:  { label: "Agendado",   color: "var(--yellow)" },
    in_storage: { label: "Em guarda",  color: "#5fa8ff" },
    returned:   { label: "Devolvido",  color: "var(--green)" },
    cancelled:  { label: "Cancelado",  color: "var(--gray-500)" },
  }

  const vaultInStorageDeposits = useMemo(
    () => deposits.filter(d => d.status === "in_storage"),
    [deposits]
  )
  const slotsInStorage = useMemo(
    () => vaultInStorageDeposits.reduce((s, d) => s + d.slots_used, 0),
    [vaultInStorageDeposits]
  )
  const vaultStoredCards = useMemo(
    () => (activeCat === "Todos" && vaultStatus)
      ? vaultInStorageDeposits.flatMap(dep =>
          (dep.items as DepositItem[]).map(item => ({ ...item, depositId: dep.id }))
        )
      : [],
    [activeCat, vaultStatus, vaultInStorageDeposits]
  )

  const emptyVaultCount = (activeCat === "Todos" && vaultStatus)
    ? Math.max(0, vaultStatus.total_slots - slotsInStorage)
    : 0

  const totalPaginatable = filteredEntries.length + vaultStoredCards.length + emptyVaultCount
  const totalPages  = Math.max(1, Math.ceil(totalPaginatable / ITEMS_PER_PAGE))
  const pageStart   = (page - 1) * ITEMS_PER_PAGE
  const pageEnd     = page * ITEMS_PER_PAGE

  const pageEntries = filteredEntries.slice(pageStart, Math.min(pageEnd, filteredEntries.length))

  const storedOffset = filteredEntries.length
  const storedStart  = Math.max(0, pageStart - storedOffset)
  const storedEnd    = Math.min(vaultStoredCards.length, Math.max(0, pageEnd - storedOffset))
  const pageStored   = vaultStoredCards.slice(storedStart, storedEnd)

  const emptyOffset    = storedOffset + vaultStoredCards.length
  const emptyStart     = Math.max(0, pageStart - emptyOffset)
  const emptyEnd       = Math.min(emptyVaultCount, Math.max(0, pageEnd - emptyOffset))
  const pageEmptyCount = Math.max(0, emptyEnd - emptyStart)

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

          {userId === null ? (
            <div style={{ marginTop: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Package size={40} style={{ opacity: 0.2 }} />
              <p className="catalog-empty">Faça login para ver seu inventário.</p>
              <Link href="/login?next=/inventario" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "1px solid rgba(95,168,255,0.35)", borderRadius: 8, background: "rgba(95,168,255,0.08)", color: "var(--blue)", textDecoration: "none", fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>
                Fazer login
              </Link>
            </div>
          ) : activeTab === "historico" ? (
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
                    delivered: { label: "Entregue no jogo",  color: "#22c55e" },
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
                          <span className="inventario-history-qty" style={{ color: entry.source === "delivered" ? "#22c55e" : color }}>
                            {entry.source === "delivered" ? "✓" : "+"}{entry.quantity}
                          </span>
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
                    <strong style={{ color: "var(--green)" }}>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    <span>Valor estimado</span>
                  </div>
                </div>
              </div>

              {/* Cofre de Expedição */}
              {vaultStatus && (() => {
                const { expedition, packs_count, total_slots } = vaultStatus
                const used    = Math.max(0, totalQty - capacity)
                const pct     = total_slots > 0 ? Math.min(100, Math.round((used / total_slots) * 100)) : 0
                const diff    = new Date(expedition.ends_at).getTime() - Date.now()
                const days    = Math.floor(diff / 86400000)
                const hours   = Math.floor((diff % 86400000) / 3600000)
                const expiry  = diff <= 0 ? "Expirada" : days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((diff % 3600000) / 60000)}m`

                return (
                  <div style={{
                    margin: "8px 0 16px",
                    background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.04) 55%, transparent 100%)",
                    border: "1px solid rgba(245,158,11,0.28)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    boxShadow: "0 0 32px rgba(245,158,11,0.08), inset 0 1px 0 rgba(245,158,11,0.10)",
                  }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Archive size={15} style={{ color: "#f59e0b" }} />
                        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f59e0b" }}>
                          Cofre de Expedição
                        </span>
                        <span style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 500 }}>— {expedition.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: diff > 0 ? "#22c55e" : "var(--red)", background: diff > 0 ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", border: `1px solid ${diff > 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, borderRadius: 4, padding: "2px 7px" }}>
                          <Clock size={10} />
                          {expiry}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 4, padding: "2px 7px" }}>
                          ATIVA
                        </span>
                      </div>
                    </div>

                    {/* Barra de capacidade */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--gray-400)" }}>Slots utilizados</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--paper)" }}>
                          {used.toLocaleString("pt-BR")}
                          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--gray-500)" }}> / {total_slots.toLocaleString("pt-BR")}</span>
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 99,
                          background: pct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#f59e0b,#fcd34d)",
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                        <strong style={{ color: "var(--paper)" }}>{packs_count}</strong> {packs_count === 1 ? "pacote comprado" : "pacotes comprados"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                        <strong style={{ color: "var(--paper)" }}>{expedition.slots_per_pack}</strong> slots por pacote
                      </span>
                      <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                        <strong style={{ color: "#f59e0b" }}>{Math.max(0, total_slots - used).toLocaleString("pt-BR")}</strong> slots livres
                      </span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => openDepositModal("deposit")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.40)", background: "rgba(245,158,11,0.12)", color: "#f59e0b", cursor: "pointer" }}>
                          <Truck size={13} /> Agendar Entrega
                        </button>
                        <button type="button" onClick={() => openDepositModal("pickup")}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(95,168,255,0.35)", background: "rgba(95,168,255,0.08)", color: "var(--blue)", cursor: "pointer" }}>
                          <Archive size={13} /> Agendar Retirada
                        </button>
                      </div>
                    </div>

                    {/* Lista de agendamentos */}
                    {deposits.length > 0 && (
                      <div style={{ marginTop: 16, borderTop: "1px solid rgba(245,158,11,0.12)", paddingTop: 14 }}>
                        <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)" }}>
                          Meus Agendamentos
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {deposits.map(dep => {
                            const st = DEPOSIT_STATUS[dep.status] ?? { label: dep.status, color: "var(--gray-500)" }
                            const typeLabel = dep.type === "deposit" ? "Entrega" : "Retirada"
                            const when = dep.preferred_at
                              ? new Date(dep.preferred_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                              : "A combinar"
                            return (
                              <div key={dep.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4, background: `color-mix(in srgb, ${st.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${st.color} 28%, transparent)`, color: st.color, whiteSpace: "nowrap" }}>
                                  {st.label}
                                </span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--paper)", minWidth: 56 }}>{typeLabel}</span>
                                <span style={{ fontSize: 11, color: "var(--gray-400)", flex: 1 }}>
                                  {(dep.items as DepositItem[]).slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(", ")}
                                  {dep.items.length > 2 && ` +${dep.items.length - 2}`}
                                </span>
                                {dep.type === "deposit" && (
                                  <span style={{ fontSize: 11, color: "#f59e0b", whiteSpace: "nowrap" }}>{dep.slots_used} slots</span>
                                )}
                                <span style={{ fontSize: 10, color: "var(--gray-500)", whiteSpace: "nowrap" }}>{when}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

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
                          {(item?.price_points ?? Math.round((item?.value ?? 0) * 24)).toLocaleString("pt-BR")} pts
                        </div>
                      </div>
                    </div>
                  )
                })}
                {pageStored.map((item, i) => {
                  const color = RARITY_COLORS[item.rarity] ?? "#566171"
                  return (
                    <div key={`stored-${item.depositId}-${i}`}
                      className="inventario-item-card inventario-item-card--vault-stored"
                      style={{ "--item-color": "#f59e0b" } as React.CSSProperties}
                      title={`Em guarda no Cofre de Expedição`}>
                      <span className="inventario-item-rarity-badge" style={{ color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}>
                        {rarityKey(item.rarity)}
                      </span>
                      <span className="inventario-item-qty">x{item.quantity}</span>
                      <div className="inventario-item-media" style={{ color: "#f59e0b", opacity: 0.7 }}>
                        <Archive size={28} />
                      </div>
                      <div className="inventario-item-body">
                        <p className="inventario-item-name">{item.name}</p>
                        <p className="inventario-item-cat">Cofre de Expedição</p>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 4, padding: "2px 6px", marginTop: 2 }}>
                          🔒 Em guarda
                        </div>
                      </div>
                    </div>
                  )
                })}
                {Array.from({ length: pageEmptyCount }).map((_, i) => (
                  <div
                    key={`vault-slot-${emptyStart + i}`}
                    className="inventario-item-card inventario-item-card--vault-empty"
                    title="Slot disponível — Cofre de Expedição"
                  />
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="inventario-pagination">
                  <span className="inventario-pagination-info">
                    Mostrando {pageStart + 1}–{Math.min(pageEnd, totalPaginatable)} de {filteredEntries.length} itens
                    {emptyVaultCount > 0 && ` + ${emptyVaultCount} slots do cofre`}
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

        {/* Modal de agendamento do cofre */}
        {depositModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={() => setDepositModal(null)} />
            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column", background: "var(--bg-elevated, #1a1d23)", border: "1px solid rgba(245,158,11,0.28)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {depositModal === "deposit" ? <Truck size={16} style={{ color: "#f59e0b" }} /> : <Archive size={16} style={{ color: "var(--blue)" }} />}
                  <span style={{ fontSize: 13, fontWeight: 950, letterSpacing: "0.04em", textTransform: "uppercase", color: depositModal === "deposit" ? "#f59e0b" : "var(--blue)" }}>
                    {depositModal === "deposit" ? "Agendar Entrega ao Cofre" : "Agendar Retirada do Cofre"}
                  </span>
                </div>
                <button type="button" onClick={() => setDepositModal(null)} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Corpo */}
              <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                {/* Coluna esq: busca no catálogo */}
                <div style={{ padding: "16px 14px", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)" }}>
                    Selecionar Itens do Catálogo
                  </p>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", marginBottom: 10 }}>
                    <Search size={13} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
                    <input
                      type="search" placeholder="Buscar item..." autoComplete="off" value={depositSearch}
                      onChange={e => setDepositSearch(e.target.value)}
                      style={{ background: "none", border: "none", outline: "none", color: "var(--paper)", fontSize: 12, width: "100%", font: "inherit" }}
                    />
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
                    {!depositCatalogLoaded ? (
                      <p style={{ fontSize: 12, color: "var(--gray-500)", padding: 8 }}>Carregando catálogo...</p>
                    ) : depositCatalogFiltered.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--gray-500)", padding: 8 }}>Nenhum item encontrado.</p>
                    ) : depositCatalogFiltered.map(item => {
                      const color = RARITY_COLORS[item.rarity ?? ""] ?? "#566171"
                      return (
                        <button type="button" key={item.id} onClick={() => addDepositItem(item)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: "1px solid transparent", background: "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left", width: "100%" }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 30%, transparent)`)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: `color-mix(in srgb, ${color} 12%, rgba(255,255,255,0.04))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {item.image
                              ? <img src={item.image} alt={item.name} style={{ width: 22, height: 22, objectFit: "contain" }} />
                              : <span style={{ fontSize: 10, fontWeight: 950, color }}>{item.name[0]}</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                            <p style={{ margin: 0, fontSize: 10, color }}>{rarityLabel(item.rarity)}</p>
                          </div>
                          <Plus size={12} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Coluna dir: selecionados + detalhes */}
                <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)" }}>
                        Itens Selecionados
                      </p>
                      {depositModal === "deposit" && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: slotsForModal > (vaultStatus?.total_slots ?? 0) ? "var(--red)" : "#f59e0b" }}>
                          {slotsForModal} slot{slotsForModal !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {depositItems.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--gray-500)" }}>Nenhum item selecionado.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                        {depositItems.map(item => {
                          const color = RARITY_COLORS[item.rarity] ?? "#566171"
                          const perSlot = ITEMS_PER_SLOT[item.rarity] ?? 1
                          return (
                            <div key={`${item.id}-${item.name}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: `1px solid color-mix(in srgb, ${color} 18%, transparent)` }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                              <span style={{ flex: 1, fontSize: 11, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                              {depositModal === "deposit" && (
                                <span style={{ fontSize: 10, color: "var(--gray-500)", flexShrink: 0 }}>{Math.ceil(item.quantity / perSlot)}s</span>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                <button type="button" onClick={() => changeDepositQty(item.id, item.name, -1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--paper)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>−</button>
                                <span style={{ fontSize: 11, minWidth: 20, textAlign: "center", color: "var(--paper)" }}>{item.quantity}</span>
                                <button type="button" onClick={() => changeDepositQty(item.id, item.name, 1)} style={{ width: 20, height: 20, borderRadius: 4, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--paper)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>+</button>
                              </div>
                              <button type="button" onClick={() => removeDepositItem(item.id, item.name)} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 2, lineHeight: 0 }}>
                                <X size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {depositModal === "deposit" && depositItems.length > 0 && (
                    <div style={{ fontSize: 10, color: "var(--gray-500)", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                      {Object.entries(ITEMS_PER_SLOT).map(([r, n]) => `${r}: ${n}/slot`).join(" · ")}
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)", marginBottom: 6 }}>
                      <CalendarClock size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                      Horário preferido (opcional)
                    </label>
                    <input type="date"
                      value={depositDate}
                      min={new Date().toISOString().slice(0, 10)}
                      max={depositMaxDate || undefined}
                      onChange={e => loadDepositTimes(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "var(--paper)", font: "inherit", fontSize: 12, boxSizing: "border-box", marginBottom: 8 }}
                    />
                    {depositDate && (
                      depositTimesLoading ? (
                        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: 0 }}>Buscando horários...</p>
                      ) : depositTimes.length === 0 ? (
                        <p style={{ fontSize: 11, color: "var(--gray-500)", margin: 0 }}>Nenhum horário disponível neste dia.</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {depositTimes.map(t => (
                            <button key={t} type="button"
                              onClick={() => setDepositSelectedTime(depositSelectedTime === t ? "" : t)}
                              style={{ padding: "5px 10px", borderRadius: 7, border: depositSelectedTime === t ? "1px solid rgba(245,158,11,0.55)" : "1px solid rgba(255,255,255,0.12)", background: depositSelectedTime === t ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.05)", color: depositSelectedTime === t ? "#f59e0b" : "var(--paper)", fontSize: 12, fontWeight: depositSelectedTime === t ? 800 : 500, cursor: "pointer" }}>
                              {t}
                            </button>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)", marginBottom: 6 }}>
                      Observações
                    </label>
                    <textarea value={depositNotes} onChange={e => setDepositNotes(e.target.value)} rows={2} placeholder="Ex: entrar em contato pelo discord..."
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "var(--paper)", font: "inherit", fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: depositMsg.startsWith("Agendamento") ? "var(--green)" : "var(--red)", flex: 1 }}>
                  {depositMsg}
                </span>
                <button type="button" onClick={() => setDepositModal(null)}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "var(--gray-400)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleDepositSubmit} disabled={depositLoading || depositItems.length === 0}
                  style={{ padding: "8px 22px", borderRadius: 8, border: `1px solid ${depositModal === "deposit" ? "rgba(245,158,11,0.45)" : "rgba(95,168,255,0.40)"}`, background: depositModal === "deposit" ? "rgba(245,158,11,0.15)" : "rgba(95,168,255,0.12)", color: depositModal === "deposit" ? "#f59e0b" : "var(--blue)", cursor: "pointer", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.06em", opacity: (depositLoading || depositItems.length === 0) ? 0.5 : 1 }}>
                  {depositLoading ? "Enviando..." : "Confirmar Agendamento"}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <span className="inventario-valioso-value">R$ {(item?.price_cash ?? item?.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

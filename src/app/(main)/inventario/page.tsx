"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Archive, ChevronLeft, ChevronRight, Coins, HelpCircle, Package, Plus, Search, ShoppingBag, Star, Truck, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/inventario.css"

// ── Mock data ──────────────────────────────────────────────────────────────
// TODO: substituir por query real quando a tabela `inventory` for criada.
// Estrutura esperada: { id, item_id, item_name, category, rarity, quantity, value, icon_url }

type InventoryItem = {
  id: string
  name: string
  category: string
  rarity: "Comum" | "Incomum" | "Raro" | "Épico" | "Lendário"
  quantity: number
  value: number
  icon?: string
}

const RARITY_COLORS: Record<string, string> = {
  Comum:    "#8b99aa",
  Incomum:  "#3df28b",
  Raro:     "#5fa8ff",
  Épico:    "#b477ff",
  Lendário: "#ffd400",
}

const MOCK_ITEMS: InventoryItem[] = [
  // Lendários — Armas
  { id: "1",  name: "Afélio",                                        category: "Armas",       rarity: "Lendário", quantity: 1,  value: 27500 },
  { id: "2",  name: "Dolabra",                                       category: "Armas",       rarity: "Lendário", quantity: 1,  value: 27500 },
  { id: "3",  name: "Equalizador",                                   category: "Armas",       rarity: "Lendário", quantity: 1,  value: 27500 },
  { id: "4",  name: "Júpiter",                                       category: "Armas",       rarity: "Lendário", quantity: 1,  value: 27500 },
  // Lendários — Outros
  { id: "5",  name: "Reator da Rainha",                              category: "Outros",      rarity: "Lendário", quantity: 1,  value: 11000 },
  { id: "6",  name: "Reator da Matriarca",                          category: "Outros",      rarity: "Lendário", quantity: 1,  value: 11000 },
  // Épicos
  { id: "7",  name: "Bettina IV",                                    category: "Armas",       rarity: "Épico",    quantity: 1,  value: 18000 },
  { id: "8",  name: "Bettina III",                                   category: "Armas",       rarity: "Épico",    quantity: 1,  value: 14000 },
  { id: "9",  name: "Assessor Matrix",                              category: "Outros",      rarity: "Épico",    quantity: 2,  value: 5000  },
  { id: "10", name: "Células de Baluarte",                          category: "Outros",      rarity: "Épico",    quantity: 3,  value: 3000  },
  // Raros — Armas e modificações
  { id: "11", name: "Empunhadura Angulada III",                     category: "Componentes", rarity: "Raro",     quantity: 1,  value: 5000  },
  { id: "12", name: "Bigorna IV",                                    category: "Armas",       rarity: "Incomum",  quantity: 1,  value: 13000 },
  { id: "13", name: "Bigorna III",                                   category: "Armas",       rarity: "Incomum",  quantity: 1,  value: 10000 },
  // Raros — Recursos
  { id: "14", name: "Bateria ARC Avançada",                         category: "Recursos",    rarity: "Raro",     quantity: 4,  value: 640   },
  { id: "15", name: "Componentes Elétricos Avançados",              category: "Recursos",    rarity: "Raro",     quantity: 2,  value: 1750  },
  { id: "16", name: "Componentes Mecânicos Avançados",              category: "Recursos",    rarity: "Raro",     quantity: 2,  value: 1750  },
  { id: "17", name: "Circuito ARC",                                  category: "Recursos",    rarity: "Raro",     quantity: 5,  value: 1000  },
  { id: "18", name: "Antisséptico",                                  category: "Recursos",    rarity: "Raro",     quantity: 3,  value: 1000  },
  // Incomuns — Recursos e Componentes
  { id: "19", name: "Liga ARC",                                      category: "Recursos",    rarity: "Incomum",  quantity: 12, value: 200   },
  { id: "20", name: "Empunhadura Angulada II",                      category: "Componentes", rarity: "Incomum",  quantity: 2,  value: 2000  },
  // Comuns
  { id: "21", name: "Injeção de Adrenalina",                        category: "Outros",      rarity: "Comum",    quantity: 6,  value: 300   },
  { id: "22", name: "Suco de Agave",                                 category: "Outros",      rarity: "Comum",    quantity: 4,  value: 1800  },
  { id: "23", name: "Empunhadura Angulada I",                       category: "Componentes", rarity: "Comum",    quantity: 3,  value: 640   },
  { id: "24", name: "Código de Segurança de Ancient Fort",          category: "Outros",      rarity: "Comum",    quantity: 8,  value: 100   },
]

const CATEGORIES = ["Todos", "Armas", "Equipamentos", "Recursos", "Componentes", "Outros"]
const ITEMS_PER_PAGE = 24
// Mock total: simula 358 itens no inventário completo
const MOCK_TOTAL = 358

const PANEL_KEY = "inventario-panel-open"

// ── Donut chart ────────────────────────────────────────────────────────────

function DonutChart({ items }: { items: InventoryItem[] }) {
  const r = 58
  const cx = 70
  const cy = 70
  const circumference = 2 * Math.PI * r
  const gap = 3

  const byRarity = useMemo(() => {
    const total = items.reduce((s, i) => s + i.quantity, 0)
    const segments = [
      { label: "Comum",    color: "#8b99aa", count: 0 },
      { label: "Raro",     color: "#5fa8ff", count: 0 },
      { label: "Épico",    color: "#b477ff", count: 0 },
      { label: "Lendário", color: "#ffd400", count: 0 },
      { label: "Outros",   color: "#566171", count: 0 },
    ]
    for (const item of items) {
      const idx = item.rarity === "Incomum" ? 4
        : item.rarity === "Comum" ? 0
        : item.rarity === "Raro" ? 1
        : item.rarity === "Épico" ? 2
        : 3
      segments[idx].count += item.quantity
    }
    return { segments, total }
  }, [items])

  let offset = 0
  return (
    <div className="inventario-donut-chart">
      <svg viewBox="0 0 140 140" width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        {byRarity.segments.map(seg => {
          const len = (seg.count / byRarity.total) * circumference
          const element = (
            <circle
              key={seg.label}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="18"
              strokeDasharray={`${Math.max(0, len - gap)} ${circumference - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return element
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
  const [points, setPoints] = useState<number | null>(null)
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({})
  const [loadingImages, setLoadingImages] = useState(true)
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
    const names = MOCK_ITEMS.map(i => i.name)
    fetch("/api/items/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    })
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string | null> = {}
        for (const entry of d.images ?? []) map[entry.name] = entry.icon_url
        setImageMap(map)
      })
      .catch(() => {})
      .finally(() => setLoadingImages(false))
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  const items = MOCK_ITEMS

  // Stats derivados do mock
  const totalQty     = items.reduce((s, i) => s + i.quantity, 0)
  const rarosQty     = items.filter(i => i.rarity === "Raro").reduce((s, i) => s + i.quantity, 0)
  const epicosQty    = items.filter(i => i.rarity === "Épico").reduce((s, i) => s + i.quantity, 0)
  const lendariosQty = items.filter(i => i.rarity === "Lendário").reduce((s, i) => s + i.quantity, 0)
  const valorTotal   = items.reduce((s, i) => s + i.value * i.quantity, 0)

  // Contagens por categoria
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: totalQty }
    for (const item of items) {
      counts[item.category] = (counts[item.category] ?? 0) + item.quantity
    }
    return counts
  }, [items, totalQty])

  // Itens mais valiosos
  const topItems = useMemo(() =>
    [...items].sort((a, b) => b.value - a.value).slice(0, 3)
  , [items])

  // Legenda do donut
  const rarityLegend = useMemo(() => [
    { label: "Comum",    color: "#8b99aa", count: items.filter(i => i.rarity === "Comum").reduce((s, i) => s + i.quantity, 0) },
    { label: "Raro",     color: "#5fa8ff", count: rarosQty },
    { label: "Épico",    color: "#b477ff", count: epicosQty },
    { label: "Lendário", color: "#ffd400", count: lendariosQty },
    { label: "Outros",   color: "#566171", count: items.filter(i => i.rarity === "Incomum").reduce((s, i) => s + i.quantity, 0) },
  ], [items, rarosQty, epicosQty, lendariosQty])

  const totalPages = Math.ceil(MOCK_TOTAL / ITEMS_PER_PAGE)

  const tabs = [
    { key: "geral",     label: "Visão Geral" },
    { key: "itens",     label: "Itens" },
    { key: "historico", label: "Histórico" },
    { key: "colecoes",  label: "Coleções" },
  ]

  return (
    <div className={`inventario-page${panelOpen ? "" : " inventario-page--panel-closed"}`}>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="store-main">

          {/* Header */}
          <div className="inventario-header">
            <div className="inventario-title">
              <h1 className="page-title">Inventário</h1>
              <button type="button" className="inventario-title-help" title="Ajuda">?</button>
            </div>
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
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`inventario-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab !== "geral" ? (
            <p className="catalog-empty" style={{ marginTop: 48 }}>
              Em breve.
            </p>
          ) : (
            <>
              {/* Stats */}
              <div className="inventario-stats">
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--total"><Package size={18} /></div>
                  <div className="inventario-stat-body">
                    <strong>{totalQty.toLocaleString("pt-BR")}</strong>
                    <span>Itens totais</span>
                    <p className="inventario-stat-sub">{items.length} itens únicos</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--raro">
                    <span style={{ fontSize: 14, fontWeight: 950, color: "#5fa8ff" }}>R</span>
                  </div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#5fa8ff" }}>{rarosQty}</strong>
                    <span>Raros</span>
                    <p className="inventario-stat-sub">{Math.round((rarosQty / totalQty) * 100)}% do total</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--epico">
                    <span style={{ fontSize: 14, fontWeight: 950, color: "#b477ff" }}>É</span>
                  </div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#b477ff" }}>{epicosQty}</strong>
                    <span>Épicos</span>
                    <p className="inventario-stat-sub">{Math.round((epicosQty / totalQty) * 100)}% do total</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--lend">
                    <span style={{ fontSize: 14, fontWeight: 950, color: "#ffd400" }}>L</span>
                  </div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "#ffd400" }}>{lendariosQty}</strong>
                    <span>Lendários</span>
                    <p className="inventario-stat-sub">Sucatas</p>
                  </div>
                </div>
                <div className="inventario-stat">
                  <div className="inventario-stat-icon inventario-stat-icon--valor"><Coins size={18} /></div>
                  <div className="inventario-stat-body">
                    <strong style={{ color: "var(--green)" }}>
                      {valorTotal.toLocaleString("pt-BR")}
                    </strong>
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
                <div className="inventario-select-wrap">
                  <span>Raridade</span>
                  <select className="inventario-select">
                    <option>Todas</option>
                    <option>Comum</option>
                    <option>Incomum</option>
                    <option>Raro</option>
                    <option>Épico</option>
                    <option>Lendário</option>
                  </select>
                </div>
                <div className="inventario-select-wrap">
                  <span>Categoria</span>
                  <select className="inventario-select">
                    <option>Todas</option>
                    {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="inventario-select-wrap">
                  <span>Origem</span>
                  <select className="inventario-select">
                    <option>Todas</option>
                    <option>Loot</option>
                    <option>Compra</option>
                    <option>Trade</option>
                  </select>
                </div>
                <div className="inventario-select-wrap">
                  <span>Ordenar</span>
                  <select className="inventario-select">
                    <option>Mais recentes</option>
                    <option>Maior valor</option>
                    <option>Menor valor</option>
                    <option>Raridade</option>
                  </select>
                </div>
                <button type="button" className="inventario-clear-btn">Limpar</button>
              </div>

              {/* Category pills */}
              <div className="inventario-cats">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`inventario-cat${activeCat === cat ? " active" : ""}`}
                    onClick={() => { setActiveCat(cat); setPage(1) }}
                  >
                    {cat} ({catCounts[cat] ?? 0})
                  </button>
                ))}
              </div>

              {/* Item grid */}
              <div className="inventario-grid">
                {items.map(item => {
                  const color = RARITY_COLORS[item.rarity]
                  return (
                    <div
                      key={item.id}
                      className="inventario-item-card"
                      style={{ "--item-color": color } as React.CSSProperties}
                    >
                      <span className="inventario-item-rarity-badge">{item.rarity}</span>
                      <span className="inventario-item-qty">x{item.quantity}</span>
                      <div className={`inventario-item-media${loadingImages ? " skeleton-block" : ""}`}>
                        {!loadingImages && (imageMap[item.name]
                          ? <img src={imageMap[item.name]!} alt={item.name} />
                          : item.name[0])}
                      </div>
                      <div className="inventario-item-body">
                        <p className="inventario-item-name">{item.name}</p>
                        <p className="inventario-item-cat">{item.category}</p>
                        <div className="inventario-item-value">
                          <Coins size={12} />
                          {item.value.toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Paginação */}
              <div className="inventario-pagination">
                <span className="inventario-pagination-info">
                  Mostrando 1–{items.length} de {MOCK_TOTAL} itens
                </span>
                <div className="inventario-pages">
                  <button type="button" className="inventario-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={14} />
                  </button>
                  {[1, 2, 3].map(n => (
                    <button key={n} type="button" className={`inventario-page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>
                      {n}
                    </button>
                  ))}
                  <span className="inventario-page-btn" style={{ border: "none", background: "none", cursor: "default" }}>…</span>
                  <button type="button" className={`inventario-page-btn${page === totalPages ? " active" : ""}`} onClick={() => setPage(totalPages)}>
                    {totalPages}
                  </button>
                  <button type="button" className="inventario-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`}>
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          {/* Donut + legenda */}
          <div className="inventario-donut-wrap">
            <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-500)", alignSelf: "flex-start" }}>
              Resumo do Inventário
            </p>
            <DonutChart items={items} />
            <div className="inventario-legend">
              {rarityLegend.map(({ label, color, count }) => (
                <div key={label} className="inventario-legend-row">
                  <span className="inventario-legend-label">
                    <span className="inventario-legend-dot" style={{ background: color }} />
                    {label}
                  </span>
                  <span className="inventario-legend-count">
                    {count} ({Math.round((count / totalQty) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Itens mais valiosos */}
          <div className="inventario-valiosos">
            <div className="inventario-panel-head">
              <h3>Itens mais valiosos</h3>
              <a href="#">Ver todos <ChevronRight size={10} /></a>
            </div>
            {topItems.map(item => (
              <div key={item.id} className="inventario-valioso-row">
                <div
                  className="inventario-valioso-img"
                  style={{ background: `color-mix(in srgb, ${RARITY_COLORS[item.rarity]} 15%, rgba(255,255,255,0.03))`, color: RARITY_COLORS[item.rarity] }}
                >
                  {imageMap[item.name]
                    ? <img src={imageMap[item.name]!} alt={item.name} style={{ width: 26, height: 26, objectFit: "contain" }} />
                    : item.name[0]}
                </div>
                <div className="inventario-valioso-info">
                  <strong>{item.name}</strong>
                  <span style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</span>
                </div>
                <span className="inventario-valioso-value">
                  {item.value.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>

          {/* Ações rápidas */}
          <div className="inventario-acoes">
            <div className="inventario-panel-head">
              <h3>Ações rápidas</h3>
            </div>
            <div className="inventario-acoes-grid">
              <Link href="/loja" className="inventario-acao">
                <div className="inventario-acao-icon" style={{ background: "rgba(255,97,113,0.12)", color: "var(--red)" }}>
                  <Truck size={14} />
                </div>
                <strong>Entregar Itens</strong>
                <span>Vender para o Sucatão</span>
              </Link>
              <Link href="/loja" className="inventario-acao">
                <div className="inventario-acao-icon" style={{ background: "rgba(95,168,255,0.12)", color: "var(--blue)" }}>
                  <ShoppingBag size={14} />
                </div>
                <strong>Ver Loja</strong>
                <span>Gastar Sucatas</span>
              </Link>
              <button type="button" className="inventario-acao" style={{ border: "1px solid var(--stroke)" }}>
                <div className="inventario-acao-icon" style={{ background: "rgba(61,242,139,0.10)", color: "var(--green)" }}>
                  <Archive size={14} />
                </div>
                <strong>Transferir</strong>
                <span>Mover itens</span>
              </button>
              <button type="button" className="inventario-acao" style={{ border: "1px solid var(--stroke)" }}>
                <div className="inventario-acao-icon" style={{ background: "rgba(255,212,0,0.10)", color: "var(--yellow)" }}>
                  <Star size={14} />
                </div>
                <strong>Favoritos</strong>
                <span>Ver itens favoritos</span>
              </button>
            </div>
          </div>

          {/* Ajuda */}
          <div className="inventario-help">
            <div className="inventario-help-icon">
              <HelpCircle size={18} />
            </div>
            <div className="inventario-help-body">
              <strong>Precisa de ajuda?</strong>
              <span>Acesse nossa Central de Suporte</span>
            </div>
            <ChevronRight size={16} style={{ color: "var(--gray-500)", marginLeft: "auto", flexShrink: 0 }} />
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

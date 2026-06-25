"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeftRight, CheckCircle, ChevronLeft, Coins, Handshake, History, Search, Sparkles } from "lucide-react"
import "../../../styles/trades.css"
import "../../../styles/home.css"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import { BrandMark } from "@/components/brand-mark"
import type { Trade } from "@/app/api/trades/route"
import type { MyTrade } from "@/app/api/trades/my/route"
import type { TradeSlot } from "@/app/api/trades/slots/route"

const PANEL_KEY = "trades-panel-open"

const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff",
  Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171",
}
const rarityLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro",
  Epic: "Épico", Legendary: "Lendário", Unknown: "?",
}

function rarityColor(r?: string | null) { return rarityColors[r ?? "Unknown"] ?? "#566171" }
function rarityLabel(r?: string | null) { return rarityLabels[r ?? "Unknown"] ?? r ?? "?" }

function rarityKey(r?: string | null) {
  if (r === "Common")    return "Comum"
  if (r === "Uncommon")  return "Incomum"
  if (r === "Rare")      return "Raro"
  if (r === "Epic")      return "Épico"
  if (r === "Legendary") return "Lendário"
  return "?"
}

const TABS = ["Todos", "Meus Trades"]

const heroSlides = [
  { image: "/assets/bots/arc_sentinel.png", tag: "Trades do Sucatão", icon: Handshake, title: "Troque Itens por Pontos", text: "O Sucatão compra itens raros diretamente de você. Aceite um trade, agende a entrega in-game e receba pontos." },
  { image: "/assets/bots/arc_leaper.png",   tag: "Como Funciona",    icon: ArrowLeftRight, title: "Processo Simples e Seguro", text: "Aceite um trade → escolha um horário de entrega → encontre o Sucatão no jogo → pontos creditados na hora." },
  { image: "/assets/bots/arc_shredder.png", tag: "Recompensas",      icon: Sparkles, title: "Pontos Para Gastar na Loja", text: "Os pontos recebidos podem ser usados para comprar itens raros, gift cards e recompensas exclusivas da loja." },
]

export default function TradesPage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTab, setActiveTab]     = useState(TABS[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator]     = useState({ left: 0, width: 0 })
  const [panelOpen, setPanelOpen]     = useState(true)

  // Dados reais
  const [trades, setTrades]           = useState<Trade[]>([])
  const [myTrades, setMyTrades]       = useState<MyTrade[]>([])
  const [userId, setUserId]           = useState<string | null>(null)
  const [points, setPoints]           = useState<number | null>(null)
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [accepting, setAccepting]     = useState<string | null>(null)
  const [loadingTrades, setLoadingTrades]     = useState(true)
  const [loadingMyTrades, setLoadingMyTrades] = useState(false)

  // Modal de agendamento (Meus Trades)
  const [scheduleModal, setScheduleModal] = useState<MyTrade | null>(null)
  const [slots, setSlots]             = useState<TradeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState("")
  const [gameId, setGameId]           = useState("")
  const [scheduling, setScheduling]   = useState<string | null>(null)
  const [scheduleMsg, setScheduleMsg] = useState("")

  // Abas com indicador
  const navigatedRef = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide(p => (p + 1) % heroSlides.length), 10000)
    return () => clearInterval(timer)
  }, [])

  useLayoutEffect(() => {
    if (localStorage.getItem(PANEL_KEY) === "false") setPanelOpen(false)
    const t = localStorage.getItem("trades-page-tab")
    if (t === "Meus Trades") setActiveTab("Meus Trades")
  }, [])

  useLayoutEffect(() => {
    function update() {
      const el = tabRefs.current[TABS.indexOf(activeTab)]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeTab])

  // Auth + trades ativos
  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        setUserId(user.id)
        supabase.from("profiles").select("points, game_id").eq("id", user.id).single()
          .then(({ data }) => {
            if (data) {
              setPoints(data.points ?? 0)
              setGameId(data.game_id ?? "")
            }
          })
      })
    })
    fetch("/api/trades")
      .then(r => r.json())
      .then(d => setTrades(d.trades ?? []))
      .catch(() => {})
      .finally(() => setLoadingTrades(false))
  }, [])

  // Meus trades — carrega assim que userId está disponível
  useEffect(() => {
    if (!userId) return
    setLoadingMyTrades(true)
    fetch("/api/trades/my")
      .then(r => r.json())
      .then(d => setMyTrades(d.trades ?? []))
      .catch(() => {})
      .finally(() => setLoadingMyTrades(false))
  }, [userId])

  // Slots ao abrir modal de agendamento
  useEffect(() => {
    if (!scheduleModal || scheduleModal.status !== "pending") return
    fetch("/api/trades/slots").then(r => r.json()).then(d => setSlots(d.slots ?? [])).catch(() => {})
  }, [scheduleModal])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  function switchTab(tab: string) {
    setActiveTab(tab)
    localStorage.setItem("trades-page-tab", tab)
  }

  async function acceptTrade(id: string) {
    if (!userId || navigatedRef.current) return
    setAccepting(id)
    const res = await fetch(`/api/trades/${id}/accept`, { method: "POST" })
    setAccepting(null)
    if (res.ok || res.status === 409) {
      setAcceptedIds(prev => new Set([...prev, id]))

      if (res.ok) {
        // Atualização otimista: adiciona o trade à lista imediatamente com dados locais
        const tradeData = trades.find(t => t.id === id)
        if (tradeData) {
          const optimistic: MyTrade = {
            id:          `optimistic-${id}`,
            status:      "pending",
            game_id:     null,
            created_at:  new Date().toISOString(),
            slot_id:     null,
            trade_slots: null,
            trades: {
              id:              tradeData.id,
              offer_points:    tradeData.offer_points,
              want_item_name:  tradeData.want_item_name,
              want_item_qty:   tradeData.want_item_qty,
              want_item_icon:  tradeData.want_item_icon,
              want_item_rarity: tradeData.want_item_rarity,
            },
          }
          setMyTrades(prev => {
            const without = prev.filter(m => m.trades?.id !== id)
            return [optimistic, ...without]
          })
        }
      }

      switchTab("Meus Trades")

      // Background: atualiza com dados reais do banco
      fetch("/api/trades/my")
        .then(r => r.json())
        .then(d => setMyTrades(d.trades ?? []))
        .catch(() => {})
    }
  }

  async function scheduleMyTrade(acceptanceId: string) {
    if (!selectedSlot) return
    setScheduling(acceptanceId)
    setScheduleMsg("")
    const res = await fetch(`/api/trades/my/${acceptanceId}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id: selectedSlot, game_id: gameId }),
    })
    setScheduling(null)
    if (res.ok) {
      setScheduleMsg("Horário confirmado!")
      setSelectedSlot("")
      setTimeout(() => {
        setScheduleModal(null)
        setScheduleMsg("")
        fetch("/api/trades/my").then(r => r.json()).then(d => setMyTrades(d.trades ?? [])).catch(() => {})
      }, 1500)
    } else {
      const body = await res.json().catch(() => ({}))
      setScheduleMsg(body.error ?? "Erro ao agendar.")
    }
  }

  // Filtros — aba Todos
  const [searchQuery, setSearchQuery]   = useState("")
  const [rarityFilter, setRarityFilter] = useState("all")
  const [sortOrder, setSortOrder]       = useState("recent")

  // Filtros — aba Meus Trades
  const [mySearchQuery, setMySearchQuery] = useState("")
  const [myStatusFilter, setMyStatusFilter] = useState("all")
  const [mySortOrder, setMySortOrder]     = useState("recent")

  const filteredTrades = trades
    .filter(t => !acceptedIds.has(t.id)) // remove trades aceitos imediatamente
    .filter(t => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (!t.want_item_name.toLowerCase().includes(q)) return false
      }
      if (rarityFilter !== "all" && t.want_item_rarity !== rarityFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortOrder === "pts-desc") return b.offer_points - a.offer_points
      if (sortOrder === "pts-asc")  return a.offer_points - b.offer_points
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const filteredMyTrades = myTrades
    .filter(mt => {
      if (myStatusFilter !== "all" && mt.status !== myStatusFilter) return false
      if (mySearchQuery.trim()) {
        const q = mySearchQuery.toLowerCase()
        if (!mt.trades?.want_item_name?.toLowerCase().includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (mySortOrder === "pts-desc") return (b.trades?.offer_points ?? 0) - (a.trades?.offer_points ?? 0)
      if (mySortOrder === "pts-asc")  return (a.trades?.offer_points ?? 0) - (b.trades?.offer_points ?? 0)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const pendingCount   = myTrades.filter(m => m.status === "pending").length
  const scheduledCount = myTrades.filter(m => m.status === "scheduled").length

  return (
    <div className={`trades-page${panelOpen ? "" : " trades-page--panel-closed"}`}>
      <div className={`trades-layout${panelOpen ? "" : " trades-layout--no-panel"}`}>
        <div className="trades-main">

          {/* Topbar */}
          <div className="trades-topbar">
            <h1 className="page-title">Trades</h1>
            {myTrades.length > 0 && (
              <div style={{ display: "flex", gap: 8 }}>
                {pendingCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 950, padding: "4px 10px", borderRadius: 20, background: "rgba(255,212,0,0.1)", color: "var(--yellow)", border: "1px solid rgba(255,212,0,0.3)" }}>
                    {pendingCount} aguardando agendamento
                  </span>
                )}
                {scheduledCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 950, padding: "4px 10px", borderRadius: 20, background: "rgba(95,168,255,0.1)", color: "var(--blue)", border: "1px solid rgba(95,168,255,0.3)" }}>
                    {scheduledCount} agendado{scheduledCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="store-tabs trades-tabs">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                ref={el => { tabRefs.current[i] = el }}
                type="button"
                className={`store-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => switchTab(tab)}
              >
                {tab}
              </button>
            ))}
            <span className="store-tab-indicator" style={{ left: indicator.left, width: indicator.width }} />
          </div>

          {/* ── ABA: TODOS ── */}
          {activeTab === "Todos" && (
            <>
              {/* Hero */}
              <section aria-label="Sobre os trades">
                <div className="hero-banner">
                  {heroSlides.map((slide, i) => (
                    <div key={i} className="hero-banner-bg" style={{ backgroundImage: `url(${slide.image})`, opacity: i === activeSlide ? 1 : 0 }} />
                  ))}
                  <div className="hero-banner-content" key={activeSlide}>
                    {(() => { const Icon = heroSlides[activeSlide].icon; return (
                      <span className="hero-banner-tag"><Icon size={12} />{heroSlides[activeSlide].tag}</span>
                    )})()}
                    <h2>{heroSlides[activeSlide].title}</h2>
                    <p>{heroSlides[activeSlide].text}</p>
                  </div>
                  <div className="hero-banner-dots">
                    {heroSlides.map((_, i) => <span key={i} className={i === activeSlide ? "active" : ""} onClick={() => setActiveSlide(i)} style={{ cursor: "pointer" }} />)}
                  </div>
                </div>
              </section>

              {/* Filtros */}
              <div className="trades-filter-bar">
                <label className="trades-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Buscar por item, jogador ou código..."
                    autoComplete="off"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </label>
                <div className="trades-filter-group">
                  <span>Categoria</span>
                  <select defaultValue="Todas"><option>Todas</option></select>
                </div>
                <div className="trades-filter-group">
                  <span>Raridade</span>
                  <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
                    <option value="all">Todas</option>
                    <option value="Legendary">Lendário</option>
                    <option value="Epic">Épico</option>
                    <option value="Rare">Raro</option>
                    <option value="Uncommon">Incomum</option>
                    <option value="Common">Comum</option>
                  </select>
                </div>
                <div className="trades-filter-group">
                  <span>Plataforma</span>
                  <select defaultValue="Todas"><option>Todas</option></select>
                </div>
                <div className="trades-filter-group">
                  <span>Ordenar por</span>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                    <option value="recent">Mais recentes</option>
                    <option value="pts-desc">Maior recompensa</option>
                    <option value="pts-asc">Menor recompensa</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="trades-filter-clear"
                  onClick={() => { setSearchQuery(""); setRarityFilter("all"); setSortOrder("recent") }}
                >
                  Limpar Filtros
                </button>
              </div>

              {/* Lista de trades */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                {loadingTrades ? (
                  <p className="catalog-empty">Carregando trades...</p>
                ) : filteredTrades.length === 0 ? (
                  <p className="catalog-empty">Nenhum trade encontrado com os filtros ativos.</p>
                ) : filteredTrades.map(trade => {
                  const color    = rarityColor(trade.want_item_rarity)
                  const accepted = acceptedIds.has(trade.id)
                  return (
                    <div key={trade.id} className="trade-card" style={{ "--rarity-color": color } as React.CSSProperties}>
                      <div className="trade-card-head">
                        <div className="trade-brand-avatar"><BrandMark /></div>
                        <div className="trade-user-info">
                          <strong>Sucatão</strong>
                          <span className="trade-oficial-badge">Oficial</span>
                        </div>
                        <span className="trade-time">{new Date(trade.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>

                      <div className="trade-exchange">
                        <div className="trade-side">
                          <span className="trade-side-label">Oferece</span>
                          <div className="trade-thumb trade-thumb-points"><Coins size={22} /></div>
                          <span className="trade-points-value">{trade.offer_points.toLocaleString("pt-BR")} pts</span>
                        </div>
                        <div className="trade-swap-divider"><ArrowLeftRight size={14} /></div>
                        <div className="trade-side">
                          <span className="trade-side-label">Procura</span>
                          <div className="trade-thumb" style={{ "--rarity-color": color } as React.CSSProperties}>
                            {trade.want_item_icon
                              ? <img src={trade.want_item_icon} alt={trade.want_item_name} loading="lazy" />
                              : <div className="placeholder">{trade.want_item_name[0]?.toUpperCase()}</div>}
                            <span className="trade-thumb-qty">x{trade.want_item_qty}</span>
                          </div>
                          <span className="trade-item-name">{trade.want_item_name}</span>
                          <span className="trade-item-rarity" style={{ color }}>
                            {rarityLabel(trade.want_item_rarity)}
                          </span>
                        </div>
                      </div>

                      {userId && (
                        <button
                          type="button"
                          className={`trade-accept-full${accepted ? " accepted" : ""}`}
                          disabled={accepted || accepting === trade.id}
                          onClick={() => acceptTrade(trade.id)}
                        >
                          {accepted
                            ? <><CheckCircle size={14} /> Trade aceito</>
                            : accepting === trade.id
                              ? "Aguarde..."
                              : <><ArrowLeftRight size={14} /> Aceitar trade</>}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── ABA: MEUS TRADES ── */}
          {activeTab === "Meus Trades" && (
            <>
              <section aria-label="Meus trades">
                <div className="hero-banner hero-banner-sm" style={{ backgroundImage: "url(/assets/bots/arc_bastion.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag"><History size={12} />Histórico</span>
                    <h2>Seus Trades com o Sucatão</h2>
                    <p>Acompanhe os trades aceitos, agende entregas e veja o histórico de pontos recebidos.</p>
                  </div>
                  <div className="hero-banner-dots"><span className="active" /><span /><span /></div>
                </div>
              </section>

              {/* Filtros — Meus Trades */}
              <div className="trades-filter-bar">
                <label className="trades-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Buscar por item..."
                    autoComplete="off"
                    value={mySearchQuery}
                    onChange={e => setMySearchQuery(e.target.value)}
                  />
                </label>
                <div className="trades-filter-group">
                  <span>Status</span>
                  <select value={myStatusFilter} onChange={e => setMyStatusFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    <option value="pending">Em progresso</option>
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div className="trades-filter-group">
                  <span>Ordenar por</span>
                  <select value={mySortOrder} onChange={e => setMySortOrder(e.target.value)}>
                    <option value="recent">Mais recentes</option>
                    <option value="pts-desc">Maior recompensa</option>
                    <option value="pts-asc">Menor recompensa</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="trades-filter-clear"
                  onClick={() => { setMySearchQuery(""); setMyStatusFilter("all"); setMySortOrder("recent") }}
                >
                  Limpar Filtros
                </button>
              </div>

              {loadingMyTrades ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Carregando...</p>
              ) : !userId ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Faça login para ver seus trades.</p>
              ) : myTrades.length === 0 ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Você ainda não aceitou nenhum trade.</p>
              ) : filteredMyTrades.length === 0 ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Nenhum trade encontrado com os filtros ativos.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 8 }}>
                  {filteredMyTrades.map(mt => {
                    const t     = mt.trades
                    const color = rarityColor(t?.want_item_rarity)
                    const STATUS_LABEL: Record<string, { label: string; color: string }> = {
                      pending:   { label: "Em progresso", color: "var(--yellow)" },
                      scheduled: { label: "Agendado",     color: "var(--blue)"   },
                      completed: { label: "Concluído",    color: "var(--green)"  },
                      cancelled: { label: "Cancelado",    color: "var(--red)"    },
                    }
                    const st = STATUS_LABEL[mt.status] ?? { label: mt.status, color: "var(--gray-500)" }
                    const isClickable = mt.status === "pending" || mt.status === "scheduled"
                    return (
                      <div
                        key={mt.id}
                        className="trade-card"
                        style={{ "--rarity-color": color, cursor: isClickable ? "pointer" : "default" } as React.CSSProperties}
                        onClick={() => { if (isClickable) { setScheduleModal(mt); setSelectedSlot(""); setScheduleMsg("") } }}
                      >
                        <div className="trade-card-head">
                          <div className="trade-brand-avatar"><BrandMark /></div>
                          <div className="trade-user-info">
                            <strong>Sucatão</strong>
                            <span className="trade-oficial-badge" style={{ color: st.color, borderColor: `color-mix(in srgb, ${st.color} 30%, transparent)`, background: `color-mix(in srgb, ${st.color} 8%, transparent)` }}>
                              {st.label}
                            </span>
                          </div>
                          {isClickable && <span style={{ color: "var(--gray-500)", fontSize: 12, marginLeft: "auto", flexShrink: 0 }}>Ver detalhes →</span>}
                        </div>
                        <div className="trade-exchange">
                          <div className="trade-side">
                            <span className="trade-side-label">Recebo</span>
                            <div className="trade-thumb trade-thumb-points"><Coins size={20} /></div>
                            <span className="trade-points-value">{(t?.offer_points ?? 0).toLocaleString("pt-BR")} pts</span>
                          </div>
                          <div className="trade-swap-divider"><ArrowLeftRight size={14} /></div>
                          <div className="trade-side">
                            <span className="trade-side-label">Entrego</span>
                            <div className="trade-thumb" style={{ "--rarity-color": color } as React.CSSProperties}>
                              {t?.want_item_icon ? <img src={t.want_item_icon} alt={t.want_item_name} loading="lazy" /> : <div className="placeholder">{t?.want_item_name[0]?.toUpperCase()}</div>}
                              <span className="trade-thumb-qty">x{t?.want_item_qty}</span>
                            </div>
                            <span className="trade-item-name">{t?.want_item_name}</span>
                          </div>
                        </div>
                        {mt.status === "completed" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(61,242,139,0.06)", borderTop: "1px solid rgba(61,242,139,0.15)" }}>
                            <CheckCircle size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--paper-dim)" }}>
                              Concluído · <strong style={{ color: "var(--yellow)" }}>{(t?.offer_points ?? 0).toLocaleString("pt-BR")} pts</strong> creditados
                            </span>
                          </div>
                        )}
                        {mt.status === "cancelled" && (
                          <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,97,113,0.15)" }}>
                            <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 800 }}>Trade cancelado</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de trades">
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          {/* Stats */}
          <div className="store-side-card" style={{ marginTop: 16 }}>
            <div className="store-side-head"><h2>Resumo</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "Trades ativos",     value: trades.length,     color: "var(--paper)" },
                { label: "Aguardando agenda", value: pendingCount,      color: pendingCount   > 0 ? "var(--yellow)" : "var(--gray-500)" },
                { label: "Agendados",         value: scheduledCount,    color: scheduledCount > 0 ? "var(--blue)"   : "var(--gray-500)" },
                { label: "Concluídos",        value: myTrades.filter(m => m.status === "completed").length, color: "var(--green)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-500)" }}>{label}</span>
                  <strong style={{ fontSize: 14, fontWeight: 950, color }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)} aria-label="Abrir painel">
        <ChevronLeft size={16} /><span>Painel</span>
      </button>

      {/* ── Modal de agendamento ── */}
      {scheduleModal && (
        <div className="modal-backdrop" onClick={() => { setScheduleModal(null); setScheduleMsg(""); setSelectedSlot("") }}>
          <div className="catalog-modal" style={{ width: "min(560px, 100%)", maxHeight: "min(680px, calc(100vh - 48px))" }} onClick={e => e.stopPropagation()}>
            <button type="button" className="catalog-modal-close" onClick={() => { setScheduleModal(null); setScheduleMsg(""); setSelectedSlot("") }} aria-label="Fechar">×</button>

            {/* Imagem / ícone */}
            <div className="catalog-modal-media" style={{ "--rarity-color": rarityColor(scheduleModal.trades?.want_item_rarity) } as React.CSSProperties}>
              {scheduleModal.trades?.want_item_icon
                ? <img src={scheduleModal.trades.want_item_icon} alt={scheduleModal.trades.want_item_name} />
                : <div className="placeholder">{scheduleModal.trades?.want_item_name?.[0]?.toUpperCase()}</div>}
            </div>

            {/* Conteúdo */}
            <div className="catalog-modal-content" style={{ overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "3px 8px", border: "1px solid rgba(255,212,0,0.3)", borderRadius: 4, color: "var(--yellow)", background: "rgba(255,212,0,0.08)" }}>
                  {scheduleModal.status === "pending" ? "Agendar entrega" : "Agendado"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "3px 8px", border: `1px solid color-mix(in srgb, ${rarityColor(scheduleModal.trades?.want_item_rarity)} 30%, transparent)`, borderRadius: 4, color: rarityColor(scheduleModal.trades?.want_item_rarity), background: `color-mix(in srgb, ${rarityColor(scheduleModal.trades?.want_item_rarity)} 8%, transparent)` }}>
                  {rarityKey(scheduleModal.trades?.want_item_rarity)}
                </span>
              </div>

              <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 950, textTransform: "uppercase", color: "var(--paper)" }}>
                {scheduleModal.trades?.want_item_name}
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--paper-dim)" }}>
                Você entrega <strong>{scheduleModal.trades?.want_item_qty}×</strong> deste item e recebe{" "}
                <strong style={{ color: "var(--yellow)" }}>{(scheduleModal.trades?.offer_points ?? 0).toLocaleString("pt-BR")} pts</strong>
              </p>

              {scheduleModal.status === "pending" ? (
                <>
                  <div className="arcpedia-modal-section">
                    <p className="arcpedia-modal-label">Escolha um horário in-game</p>
                    {slots.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum horário disponível no momento.</p>
                    ) : (
                      <div className="my-trade-slots" style={{ flexWrap: "wrap" }}>
                        {slots.map(s => (
                          <button key={s.id} type="button"
                            className={`my-trade-slot${selectedSlot === s.id ? " selected" : ""}`}
                            onClick={() => setSelectedSlot(s.id)}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="arcpedia-modal-section">
                    <p className="arcpedia-modal-label">Seu Game ID (para o Sucatão te encontrar)</p>
                    <input type="text" placeholder="Ex: SucataoFan#1234" value={gameId} onChange={e => setGameId(e.target.value)}
                      style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "10px 12px", fontSize: 13, borderRadius: 8, font: "inherit", outline: "none", boxSizing: "border-box" }} />
                  </div>

                  {scheduleMsg && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 800, color: scheduleMsg.includes("!") ? "var(--green)" : "var(--red)" }}>
                      {scheduleMsg}
                    </p>
                  )}

                  <button type="button" className="material-detail-filter-btn" style={{ marginTop: 16 }}
                    disabled={!selectedSlot || scheduling === scheduleModal.id}
                    onClick={() => scheduleMyTrade(scheduleModal.id)}>
                    {scheduling === scheduleModal.id ? "Confirmando..." : "✓ Confirmar horário de entrega"}
                  </button>
                </>
              ) : scheduleModal.status === "scheduled" && scheduleModal.trade_slots ? (
                <div className="my-trade-scheduled" style={{ marginTop: 8 }}>
                  <p className="my-trade-scheduled-label">Horário confirmado</p>
                  <p className="my-trade-scheduled-time">{scheduleModal.trade_slots.label}</p>
                  <p className="my-trade-scheduled-hint">Aguarde o Sucatão no jogo no horário acima para fazer a entrega.</p>
                  {scheduleModal.game_id && (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--gray-500)" }}>
                      Game ID registrado: <strong style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{scheduleModal.game_id}</strong>
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

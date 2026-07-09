"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [activeSlide, setActiveSlide] = useState(0)
  const [activeTab, setActiveTab]     = useState(TABS[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator]     = useState({ left: 0, width: 0 })
  const [panelOpen, setPanelOpen]     = useState(false)

  // Dados reais
  const [trades, setTrades]           = useState<Trade[]>([])
  const [myTrades, setMyTrades]       = useState<MyTrade[]>([])
  const [userId, setUserId]           = useState<string | null>(null)
  const [points, setPoints]           = useState<number | null>(null)
  const [loadingTrades, setLoadingTrades]     = useState(true)
  const [loadingMyTrades, setLoadingMyTrades] = useState(false)

  // Formulário inline de aceite + agendamento (aba Todos)
  const [acceptingId, setAcceptingId]               = useState<string | null>(null)
  const [acceptSlots, setAcceptSlots]               = useState<TradeSlot[]>([])
  const [acceptLoadingSlots, setAcceptLoadingSlots] = useState(false)
  const [acceptSelectedSlot, setAcceptSelectedSlot] = useState<string | null>(null)
  const [acceptSubmitting, setAcceptSubmitting]     = useState(false)
  const [acceptMsg, setAcceptMsg]                   = useState("")
  const [gameId, setGameId]                         = useState("")

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

  // Meus trades — carrega quando userId fica disponível
  useEffect(() => {
    if (!userId) return
    setLoadingMyTrades(true)
    fetch("/api/trades/my")
      .then(r => r.json())
      .then(d => setMyTrades(d.trades ?? []))
      .catch(() => {})
      .finally(() => setLoadingMyTrades(false))
  }, [userId])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  function switchTab(tab: string) {
    setActiveTab(tab)
    localStorage.setItem("trades-page-tab", tab)
  }

  function openAcceptForm(id: string) {
    if (!userId) { router.push("/login?next=/trades"); return }
    setAcceptingId(id)
    setAcceptSelectedSlot(null)
    setAcceptMsg("")
    setAcceptLoadingSlots(true)
    fetch("/api/trades/slots")
      .then(r => r.json())
      .then(d => setAcceptSlots(d.slots ?? []))
      .catch(() => setAcceptSlots([]))
      .finally(() => setAcceptLoadingSlots(false))
  }

  async function confirmAccept(id: string) {
    if (!acceptSelectedSlot) { setAcceptMsg("Selecione um horário."); return }
    if (!gameId.trim()) { setAcceptMsg("Informe seu Game ID."); return }
    setAcceptSubmitting(true)
    setAcceptMsg("")
    const res = await fetch(`/api/trades/${id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id: acceptSelectedSlot, game_id: gameId.trim() }),
    })
    setAcceptSubmitting(false)
    if (res.ok || res.status === 409) {
      setAcceptingId(null)
      const tradeData = trades.find(t => t.id === id)
      const slot      = acceptSlots.find(s => s.id === acceptSelectedSlot)
      setMyTrades(prev => {
        if (prev.some(m => m.trades?.id === id)) return prev
        if (!tradeData) return prev
        return [{
          id:           `local-${id}`,
          status:       "scheduled",
          game_id:      gameId.trim(),
          created_at:   new Date().toISOString(),
          scheduled_at: slot?.scheduled_for ?? null,
          trades: {
            id:               tradeData.id,
            offer_points:     tradeData.offer_points,
            want_item_name:   tradeData.want_item_name,
            want_item_qty:    tradeData.want_item_qty,
            want_item_icon:   tradeData.want_item_icon,
            want_item_rarity: tradeData.want_item_rarity,
          },
        }, ...prev]
      })
      switchTab("Meus Trades")
      setTimeout(() => {
        fetch("/api/trades/my")
          .then(r => r.json())
          .then(d => { if ((d.trades ?? []).length > 0) setMyTrades(d.trades) })
          .catch(() => {})
      }, 1000)
    } else {
      const body = await res.json().catch(() => ({}))
      setAcceptMsg(body.error ?? "Erro ao aceitar trade.")
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

  // IDs de trades que o usuário já aceitou (para desabilitar o botão)
  const acceptedTradeIds = new Set(myTrades.map(m => m.trades?.id).filter(Boolean) as string[])

  const filteredTrades = trades
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
                  const accepted = acceptedTradeIds.has(trade.id) || myTrades.some(m => m.trades?.id === trade.id)
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
                        accepted ? (
                          <button type="button" className="trade-accept-full accepted" disabled>
                            <CheckCircle size={14} /> Trade aceito
                          </button>
                        ) : acceptingId === trade.id ? (
                          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--stroke)" }} onClick={e => e.stopPropagation()}>
                            {acceptLoadingSlots ? (
                              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--gray-500)" }}>Carregando horários...</p>
                            ) : acceptSlots.length === 0 ? (
                              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--gray-500)" }}>Nenhum horário disponível no momento.</p>
                            ) : (
                              <div style={{ marginBottom: 8 }}>
                                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Escolha um horário</p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {acceptSlots.map(slot => {
                                    const dt      = new Date(slot.scheduled_for)
                                    const isToday = dt.toDateString() === new Date().toDateString()
                                    const label   = isToday
                                      ? dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                      : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                    return (
                                      <button key={slot.id} type="button"
                                        className={`my-trade-slot${acceptSelectedSlot === slot.id ? " selected" : ""}`}
                                        onClick={() => setAcceptSelectedSlot(slot.id)}>
                                        {label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                            <input
                              type="text"
                              placeholder="Seu Game ID (Ex: SucataoFan#1234)"
                              value={gameId}
                              onChange={e => setGameId(e.target.value)}
                              style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "8px 10px", fontSize: 12, borderRadius: 6, font: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
                            />
                            {acceptMsg && (
                              <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--red)", fontWeight: 800 }}>{acceptMsg}</p>
                            )}
                            <div style={{ display: "flex", gap: 6 }}>
                              <button type="button"
                                style={{ flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 950, textTransform: "uppercase", background: "transparent", border: "1px solid var(--stroke)", color: "var(--gray-500)", borderRadius: 6, cursor: "pointer" }}
                                onClick={() => { setAcceptingId(null); setAcceptMsg("") }}>
                                Cancelar
                              </button>
                              <button type="button" className="trade-accept-full"
                                style={{ flex: 2, padding: "8px 0", marginTop: 0 }}
                                disabled={!acceptSelectedSlot || !gameId.trim() || acceptSubmitting}
                                onClick={() => confirmAccept(trade.id)}>
                                {acceptSubmitting ? "Confirmando..." : "✓ Confirmar trade"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="trade-accept-full"
                            onClick={() => openAcceptForm(trade.id)}>
                            <ArrowLeftRight size={14} /> Aceitar trade
                          </button>
                        )
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
                    return (
                      <div
                        key={mt.id}
                        className="trade-card"
                        style={{ "--rarity-color": color } as React.CSSProperties}
                      >
                        <div className="trade-card-head">
                          <div className="trade-brand-avatar"><BrandMark /></div>
                          <div className="trade-user-info">
                            <strong>Sucatão</strong>
                            <span className="trade-oficial-badge" style={{ color: st.color, borderColor: `color-mix(in srgb, ${st.color} 30%, transparent)`, background: `color-mix(in srgb, ${st.color} 8%, transparent)` }}>
                              {st.label}
                            </span>
                          </div>
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
                        {mt.status === "scheduled" && mt.scheduled_at && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(95,168,255,0.06)", borderTop: "1px solid rgba(95,168,255,0.15)" }}>
                            <span style={{ fontSize: 12, color: "var(--paper-dim)" }}>
                              Entrega:{" "}
                              <strong style={{ color: "var(--blue)" }}>
                                {new Date(mt.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </strong>
                              {mt.game_id && (
                                <> · <span style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{mt.game_id}</span></>
                              )}
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

    </div>
  )
}

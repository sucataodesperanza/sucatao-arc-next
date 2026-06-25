"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowLeftRight, CheckCircle, ChevronLeft, Coins, Handshake, History, Search, Sparkles } from "lucide-react"
import "../../../styles/trades.css"
import "../../globals.css"
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

  // Agendamento (Meus Trades)
  const [expandedMyTrade, setExpandedMyTrade] = useState<string | null>(null)
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

  // Meus trades (lazy)
  useEffect(() => {
    if (activeTab !== "Meus Trades" || !userId) return
    setLoadingMyTrades(true)
    fetch("/api/trades/my")
      .then(r => r.json())
      .then(d => setMyTrades(d.trades ?? []))
      .catch(() => {})
      .finally(() => setLoadingMyTrades(false))
  }, [activeTab, userId])

  // Slots ao expandir trade pendente
  useEffect(() => {
    if (!expandedMyTrade) return
    const mt = myTrades.find(m => m.id === expandedMyTrade)
    if (mt?.status !== "pending") return
    fetch("/api/trades/slots").then(r => r.json()).then(d => setSlots(d.slots ?? [])).catch(() => {})
  }, [expandedMyTrade, myTrades])

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
      setExpandedMyTrade(null)
      fetch("/api/trades/my").then(r => r.json()).then(d => setMyTrades(d.trades ?? [])).catch(() => {})
    } else {
      const body = await res.json().catch(() => ({}))
      setScheduleMsg(body.error ?? "Erro ao agendar.")
    }
  }

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

              {/* Lista de trades */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {loadingTrades ? (
                  <p className="catalog-empty">Carregando trades...</p>
                ) : trades.length === 0 ? (
                  <p className="catalog-empty">Nenhum trade ativo no momento.</p>
                ) : trades.map(trade => {
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

              {loadingMyTrades ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Carregando...</p>
              ) : !userId ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Faça login para ver seus trades.</p>
              ) : myTrades.length === 0 ? (
                <p className="catalog-empty" style={{ marginTop: 24 }}>Você ainda não aceitou nenhum trade.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  {myTrades.map(mt => {
                    const t        = mt.trades
                    const color    = rarityColor(t?.want_item_rarity)
                    const expanded = expandedMyTrade === mt.id

                    const STATUS_LABEL: Record<string, { label: string; color: string }> = {
                      pending:   { label: "Em progresso",  color: "var(--yellow)" },
                      scheduled: { label: "Agendado",      color: "var(--blue)" },
                      completed: { label: "Concluído",     color: "var(--green)" },
                      cancelled: { label: "Cancelado",     color: "var(--red)" },
                    }
                    const st = STATUS_LABEL[mt.status] ?? { label: mt.status, color: "var(--gray-500)" }

                    return (
                      <div
                        key={mt.id}
                        className="trade-card"
                        style={{ "--rarity-color": color, cursor: "pointer" } as React.CSSProperties}
                        onClick={() => { setExpandedMyTrade(expanded ? null : mt.id); setSelectedSlot(""); setScheduleMsg("") }}
                      >
                        <div className="trade-card-head">
                          <div className="trade-brand-avatar"><BrandMark /></div>
                          <div className="trade-user-info">
                            <strong>Sucatão</strong>
                            <span className="trade-oficial-badge" style={{ color: st.color, borderColor: `color-mix(in srgb, ${st.color} 30%, transparent)`, background: `color-mix(in srgb, ${st.color} 8%, transparent)` }}>
                              {st.label}
                            </span>
                          </div>
                          <span style={{ color: "var(--gray-500)", fontSize: 14, marginLeft: "auto", flexShrink: 0, transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>▾</span>
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
                              {t?.want_item_icon
                                ? <img src={t.want_item_icon} alt={t.want_item_name} loading="lazy" />
                                : <div className="placeholder">{t?.want_item_name[0]?.toUpperCase()}</div>}
                              <span className="trade-thumb-qty">x{t?.want_item_qty}</span>
                            </div>
                            <span className="trade-item-name">{t?.want_item_name}</span>
                          </div>
                        </div>

                        {/* Acordeão */}
                        {expanded && (
                          <div className="my-trade-accordion" onClick={e => e.stopPropagation()}>
                            {mt.status === "pending" && (
                              <>
                                <p className="my-trade-accordion-title">Escolha um horário in-game:</p>
                                {slots.length === 0 ? (
                                  <p style={{ color: "var(--gray-500)", fontSize: 11, margin: 0 }}>Nenhum horário disponível no momento.</p>
                                ) : (
                                  <div className="my-trade-slots">
                                    {slots.map(s => (
                                      <button key={s.id} type="button"
                                        className={`my-trade-slot${selectedSlot === s.id ? " selected" : ""}`}
                                        onClick={() => setSelectedSlot(s.id)}>
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <label style={{ display: "grid", gap: 4, marginTop: 10 }}>
                                  <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", letterSpacing: "0.06em" }}>Seu Game ID</span>
                                  <input type="text" placeholder="Ex: SucataoFan#1234" value={gameId} onChange={e => setGameId(e.target.value)}
                                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "8px 10px", fontSize: 12, borderRadius: 6, font: "inherit", outline: "none" }} />
                                </label>
                                {scheduleMsg && <p style={{ margin: "8px 0 0", fontSize: 11, color: scheduleMsg.includes("!") ? "var(--green)" : "var(--red)", fontWeight: 800 }}>{scheduleMsg}</p>}
                                <button type="button" className="my-trade-confirm-btn"
                                  disabled={!selectedSlot || scheduling === mt.id}
                                  onClick={() => scheduleMyTrade(mt.id)}>
                                  {scheduling === mt.id ? "Confirmando..." : "✓ Confirmar horário"}
                                </button>
                              </>
                            )}
                            {mt.status === "scheduled" && mt.trade_slots && (
                              <div className="my-trade-scheduled">
                                <p className="my-trade-scheduled-label">Horário confirmado</p>
                                <p className="my-trade-scheduled-time">{mt.trade_slots.label}</p>
                                <p className="my-trade-scheduled-hint">Aguarde o Sucatão no jogo no horário acima.</p>
                                {mt.game_id && <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--gray-500)" }}>Game ID: <strong style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{mt.game_id}</strong></p>}
                              </div>
                            )}
                            {mt.status === "completed" && (
                              <div className="my-trade-completed">
                                <CheckCircle size={16} style={{ color: "var(--green)" }} />
                                <span>Entrega concluída!<br /><strong style={{ color: "var(--yellow)" }}>{(t?.offer_points ?? 0).toLocaleString("pt-BR")} pts</strong> creditados na sua carteira.</span>
                              </div>
                            )}
                            {mt.status === "cancelled" && (
                              <p style={{ margin: 0, fontSize: 12, color: "var(--red)", fontWeight: 800 }}>Este trade foi cancelado.</p>
                            )}
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

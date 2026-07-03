"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import * as LucideIcons from "lucide-react"
import { ArrowLeftRight, ArrowRight, CheckCircle, ChevronLeft, Coins, Megaphone } from "lucide-react"
import type { HomeNews, HomeSlide } from "@/app/api/home/route"
import type { Trade } from "@/app/api/trades/route"
import type { MyTrade } from "@/app/api/trades/my/route"
import type { TradeSlot } from "@/app/api/trades/slots/route"
import { BrandMark } from "@/components/brand-mark"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../styles/home.css"

const TRADES_OPEN_KEY = "trades-panel-open"

const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

const rarityLabelsPt: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Épico", Legendary: "Lendário", Unknown: "Desconhecido"
}

// Helper para resolver ícone Lucide pelo nome
function getLucideIcon(name: string): React.ComponentType<{ size?: number }> {
  return (LucideIcons as any)[name] ?? Megaphone
}

const categories = [
  { href: "/loja", tag: "EVENTO", tone: "yellow", image: "/assets/bots/arc_wasp.png", title: "Itens", text: "Catálogo completo com valores e raridades." },
  { href: "/trades", tag: "TROCAS", tone: "red", image: "/assets/bots/arc_hornet.png", title: "Trades", text: "Ofertas do marketplace e custo de troca." },
  { href: "/crafting", tag: "CRAFTING", tone: "green", image: "/assets/bots/arc_sentinel.png", title: "Crafting", text: "Receitas e materiais necessários." },
  { href: "/mapas", tag: "MAPAS", tone: "cyan", image: "/assets/maps/buried_city.png", title: "Mapas", text: "Rotas e pontos de interesse nos mapas." },
]

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [newsItems, setNewsItems]     = useState<HomeNews[]>([])
  const [heroSlides, setHeroSlides]   = useState<HomeSlide[]>([])
  const [tradesOpen, setTradesOpen] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [myTrades, setMyTrades] = useState<MyTrade[]>([])
  const [activeTab, setActiveTab] = useState<"todos" | "meus">("todos")
  const [expandedMyTrade, setExpandedMyTrade] = useState<string | null>(null)
  const [slots, setSlots] = useState<TradeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [gameId, setGameId] = useState<string>("")
  const [scheduling, setScheduling] = useState<string | null>(null)
  const [scheduleMsg, setScheduleMsg] = useState<string>("")
  const tradeTabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [tradeTabIndicator, setTradeTabIndicator] = useState({ left: 0, width: 0 })
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    if (heroSlides.length === 0) return
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % heroSlides.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [heroSlides.length])

  useEffect(() => {
    const stored = localStorage.getItem(TRADES_OPEN_KEY)
    if (stored === "false") setTradesOpen(false)
    const storedTab = localStorage.getItem("trades-active-tab")
    if (storedTab === "meus" || storedTab === "todos") setActiveTab(storedTab)
    // Carrega conteúdo da home do banco
    fetch("/api/home").then(r => r.json()).then(d => {
      if (d.news?.length)   setNewsItems(d.news)
      if (d.slides?.length) { setHeroSlides(d.slides); setActiveSlide(0) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/trades")
      .then(r => r.json())
      .then(d => setTrades((d.trades ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  // Indicador deslizante das abas de trades
  useLayoutEffect(() => {
    function update() {
      const el = tradeTabRefs.current[activeTab]
      if (el) setTradeTabIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeTab])

  // Carrega meus trades sempre que o usuário estiver logado (independente da aba ativa)
  useEffect(() => {
    if (!userId) return
    fetch("/api/trades/my")
      .then(r => r.json())
      .then(d => setMyTrades(d.trades ?? []))
      .catch(() => {})
  }, [userId])

  // Carrega slots ao expandir um trade pendente
  useEffect(() => {
    if (!expandedMyTrade) return
    const mt = myTrades.find(m => m.id === expandedMyTrade)
    if (mt?.status !== "pending") return
    fetch("/api/trades/slots")
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .catch(() => {})
  }, [expandedMyTrade, myTrades])

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
      // Recarrega meus trades
      fetch("/api/trades/my").then(r => r.json()).then(d => setMyTrades(d.trades ?? [])).catch(() => {})
    } else {
      const body = await res.json().catch(() => ({}))
      setScheduleMsg(body.error ?? "Erro ao agendar.")
    }
  }

  async function acceptTrade(id: string) {
    if (!userId) return
    setAccepting(id)
    const res = await fetch(`/api/trades/${id}/accept`, { method: "POST" })
    setAccepting(null)
    if (res.ok || res.status === 409) {
      setAcceptedIds(prev => new Set([...prev, id]))
    }
  }


  function setOpen(val: boolean) {
    setTradesOpen(val)
    localStorage.setItem(TRADES_OPEN_KEY, String(val))
  }

  return (
    <div className={`home-page${tradesOpen ? "" : " home--trades-closed"}`}>
    <div className={`home-layout${tradesOpen ? "" : " home-layout--no-panel"}`}>
      <div className="home-main">
        <h1 className="page-title">Início</h1>

        <section aria-label="Notas de atualização">
          <p className="home-section-label">Notas de atualização mais recentes</p>
          <div className="news-grid">
            {newsItems.map((news, i) => {
              const NewsIcon = getLucideIcon(news.icon_name)
              const inner = (
                <>
                  <div className="news-card-media" style={{ backgroundImage: news.image_url ? `url(${news.image_url})` : undefined }}>
                    <span className="news-card-badge"><NewsIcon size={16} /></span>
                  </div>
                  <div className="news-card-body">
                    <h3>{news.title}</h3>
                    <p>{news.text}</p>
                    <span className="news-card-date">{news.date_label}</span>
                  </div>
                </>
              )
              return news.href ? (
                <Link key={news.id ?? i} href={news.href} className="news-card news-card--link">
                  {inner}
                </Link>
              ) : (
                <article key={news.id ?? i} className="news-card">{inner}</article>
              )
            })}
          </div>
        </section>

        <section aria-label="Novidades">
          <p className="home-section-label">Novidades</p>
          <div className="hero-banner">
            {heroSlides.map((slide, i) => (
              <div
                key={slide.id ?? i}
                className="hero-banner-bg"
                style={{ backgroundImage: slide.image_url ? `url(${slide.image_url})` : undefined, opacity: i === activeSlide ? 1 : 0 }}
              />
            ))}
            {heroSlides.length > 0 && (() => {
              const slide = heroSlides[activeSlide] ?? heroSlides[0]
              if (!slide) return null
              const Icon = getLucideIcon(slide.icon_name)
              return (
                <div className="hero-banner-content" key={activeSlide}>
                  <span className="hero-banner-tag">
                    <Icon size={12} />
                    {slide.tag}
                  </span>
                  <h2>{slide.title}</h2>
                  <p>{slide.text}</p>
                  <Link href={slide.cta_href} className="hero-banner-cta">
                    {slide.cta_label}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )
            })()}
            <div className="hero-banner-dots">
              {heroSlides.map((_, i) => (
                <span
                  key={i}
                  className={i === activeSlide ? "active" : ""}
                  onClick={() => setActiveSlide(i)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Categorias">
          <div className="category-row">
            {categories.map(({ href, tag, tone, image, title, text }) => (
              <Link key={href} href={href} className="category-card">
                <div className="category-card-bg" style={{ backgroundImage: `url(${image})` }} />
                <span className={`category-card-tag tone-${tone}`}>{tag}</span>
                <strong>{title}</strong>
                <span>{text}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <aside className={`trades-panel${tradesOpen ? "" : " trades-panel--hidden"}`} aria-label="Trades">
        <SidePanelUserHeader onClose={() => setOpen(false)} onUserLoaded={setUserId} />

        <div className="trades-panel-head">
          <h2>Trades</h2>
        </div>
        <div className="trades-tabs">
          <button type="button" ref={el => { tradeTabRefs.current["todos"] = el }}
            className={`trades-tab${activeTab === "todos" ? " active" : ""}`}
            onClick={() => { setActiveTab("todos"); localStorage.setItem("trades-active-tab", "todos") }}>Todos</button>
          <button type="button" ref={el => { tradeTabRefs.current["meus"] = el }}
            className={`trades-tab${activeTab === "meus" ? " active" : ""}`}
            onClick={() => { setActiveTab("meus"); localStorage.setItem("trades-active-tab", "meus") }}>Meus trades</button>
          <span className="trades-tab-indicator" style={{ left: tradeTabIndicator.left, width: tradeTabIndicator.width }} />
        </div>

        {/* Aba: Meus Trades */}
        {activeTab === "meus" && (
          <div className="trades-list">
            {!userId ? (
              <p style={{ margin: "12px 8px", color: "var(--gray-500)", fontSize: 12 }}>
                Faça login para ver seus trades.
              </p>
            ) : myTrades.length === 0 ? (
              <p style={{ margin: "12px 8px", color: "var(--gray-500)", fontSize: 12 }}>
                Você ainda não aceitou nenhum trade.
              </p>
            ) : myTrades.map(mt => {
              const t       = mt.trades
              const color   = rarityColors[t?.want_item_rarity ?? "Unknown"] ?? rarityColors.Unknown
              const expanded = expandedMyTrade === mt.id
              const statusLabel: Record<string, string> = {
                pending: "Em progresso", scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado",
              }
              const statusColor: Record<string, string> = {
                pending: "var(--yellow)", scheduled: "var(--blue)", completed: "var(--green)", cancelled: "var(--red)",
              }
              return (
                <div
                  key={mt.id}
                  className="trade-card"
                  style={{ "--rarity-color": color, cursor: "pointer" } as React.CSSProperties}
                  onClick={() => {
                    setExpandedMyTrade(expanded ? null : mt.id)
                    setSelectedSlot("")
                    setScheduleMsg("")
                  }}
                >
                  {/* Header */}
                  <div
                    className="trade-card-head my-trade-accordion-btn"
                    style={{ width: "100%", background: "none", border: "none", cursor: "pointer", font: "inherit", textAlign: "left" }}
                  >
                    <div className="trade-brand-avatar"><BrandMark /></div>
                    <div className="trade-user-info">
                      <strong>Sucatão</strong>
                      <span className="trade-oficial-badge" style={{
                        color: statusColor[mt.status] ?? "var(--gray-500)",
                        borderColor: `color-mix(in srgb, ${statusColor[mt.status] ?? "var(--stroke)"} 30%, transparent)`,
                        background: `color-mix(in srgb, ${statusColor[mt.status] ?? "transparent"} 8%, transparent)`,
                      }}>
                        {statusLabel[mt.status] ?? mt.status}
                      </span>
                    </div>
                    <span style={{ color: "var(--gray-500)", fontSize: 14, marginLeft: "auto", flexShrink: 0, transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}>▾</span>
                  </div>

                  {/* Exchange resumido */}
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
                                <button
                                  key={s.id}
                                  type="button"
                                  className={`my-trade-slot${selectedSlot === s.id ? " selected" : ""}`}
                                  onClick={() => setSelectedSlot(s.id)}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <label style={{ display: "grid", gap: 4, marginTop: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", letterSpacing: "0.06em" }}>
                              Seu Game ID (para o Sucatão te encontrar)
                            </span>
                            <input
                              type="text"
                              placeholder="Ex: SucataoFan#1234"
                              value={gameId}
                              onChange={e => setGameId(e.target.value)}
                              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "8px 10px", fontSize: 12, borderRadius: 6, font: "inherit", outline: "none" }}
                            />
                          </label>
                          {scheduleMsg && <p style={{ margin: "8px 0 0", fontSize: 11, color: scheduleMsg.includes("!") ? "var(--green)" : "var(--red)" }}>{scheduleMsg}</p>}
                          <button
                            type="button"
                            className="my-trade-confirm-btn"
                            disabled={!selectedSlot || scheduling === mt.id}
                            onClick={() => scheduleMyTrade(mt.id)}
                          >
                            {scheduling === mt.id ? "Confirmando..." : "✓ Confirmar horário"}
                          </button>
                        </>
                      )}

                      {mt.status === "scheduled" && mt.scheduled_at && (
                        <div className="my-trade-scheduled">
                          <p className="my-trade-scheduled-label">Horário confirmado</p>
                          <p className="my-trade-scheduled-time">{new Date(mt.scheduled_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })} in-game</p>
                          <p className="my-trade-scheduled-hint">Aguarde o Sucatão no jogo no horário acima.</p>
                          {mt.game_id && (
                            <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--gray-500)" }}>Game ID: <strong style={{ color: "var(--cyan)", fontFamily: "monospace" }}>{mt.game_id}</strong></p>
                          )}
                        </div>
                      )}

                      {mt.status === "completed" && (
                        <div className="my-trade-completed">
                          <CheckCircle size={16} style={{ color: "var(--green)" }} />
                          <span>Entrega concluída!<br /><strong style={{ color: "var(--yellow)" }}>{(t?.offer_points ?? 0).toLocaleString("pt-BR")} pts</strong> creditados na sua carteira.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Aba: Todos */}
        {activeTab === "todos" && <div className="trades-list">
          {trades.length === 0 ? (
            <p style={{ margin: "12px 0", color: "var(--gray-500)", fontSize: 12, textAlign: "center" }}>
              Nenhum trade ativo no momento.
            </p>
          ) : trades.map(trade => {
            const color    = rarityColors[trade.want_item_rarity ?? "Unknown"] ?? rarityColors.Unknown
            const accepted = acceptedIds.has(trade.id)
            return (
              <div
                key={trade.id}
                className="trade-card"
                style={{ "--rarity-color": color } as React.CSSProperties}
              >
                {/* Header */}
                <div className="trade-card-head">
                  <div className="trade-brand-avatar">
                    <BrandMark />
                  </div>
                  <div className="trade-user-info">
                    <strong>Sucatão</strong>
                    <span className="trade-oficial-badge">Oficial</span>
                  </div>
                  <span className="trade-time">
                    {new Date(trade.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {/* Exchange */}
                <div className="trade-exchange">
                  <div className="trade-side">
                    <span className="trade-side-label">Oferece</span>
                    <div className="trade-thumb trade-thumb-points"><Coins size={22} /></div>
                    <span className="trade-points-value">
                      {trade.offer_points.toLocaleString("pt-BR")} pts
                    </span>
                  </div>

                  <div className="trade-swap-divider">
                    <ArrowLeftRight size={14} />
                  </div>

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
                      {rarityLabelsPt[trade.want_item_rarity ?? "Unknown"] ?? trade.want_item_rarity ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Botão aceitar */}
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
        </div>}
        <Link href="/trades" className="trades-footer-btn">
          Ver todos os trades
          <ArrowRight size={16} />
        </Link>
      </aside>
    </div>

    <button
      type="button"
      className="trades-reopen-btn"
      onClick={() => setOpen(true)}
      aria-label="Abrir painel de trades"
    >
      <ChevronLeft size={16} />
      <span>Trades</span>
    </button>
    </div>
  )
}

"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { Ticket, TrendingUp, Trophy, ChevronRight, Minus, Plus, Loader2, Radio } from "lucide-react"

type Sorteio = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  badge: string | null
  badge_color: string
  ticket_price: number
  max_tickets: number
  tickets_sold: number
  status: "upcoming" | "active" | "finished" | "cancelled"
  starts_at: string
  ends_at: string
  winner_id: string | null
  winner_ticket: number | null
  winner_name: string | null
  drawn_at: string | null
  user_tickets: number[]
}

type SorteiosData = {
  active: Sorteio | null
  others: Sorteio[]
  user_points: number
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  upcoming:  { label: "EM BREVE",   color: "#f59e0b" },
  active:    { label: "AGUARDANDO", color: "var(--cyan)" },
  finished:  { label: "FINALIZADO", color: "#ef4444" },
  cancelled: { label: "CANCELADO",  color: "var(--gray-500)" },
}

const BADGE_COLORS: Record<string, string> = {
  purple: "#a855f7",
  yellow: "#f59e0b",
  cyan:   "var(--cyan)",
  red:    "#ef4444",
  green:  "#22c55e",
}

function pad(n: number) { return String(n).padStart(2, "0") }

function useCountdown(endsAt: string | null) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0, done: false })
  useEffect(() => {
    if (!endsAt) return
    function tick() {
      const diff = Math.max(0, new Date(endsAt!).getTime() - Date.now())
      if (diff === 0) { setParts({ d: 0, h: 0, m: 0, s: 0, done: true }); return }
      const s = Math.floor(diff / 1000)
      setParts({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: false })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endsAt])
  return parts
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function ActiveSorteioCard({ sorteio, userPoints, onBuy }: {
  sorteio: Sorteio
  userPoints: number
  onBuy: (id: string, qty: number) => Promise<void>
}) {
  const [qty, setQty]       = useState(1)
  const [buying, setBuying] = useState(false)
  const [error, setError]   = useState("")
  const countdown = useCountdown(sorteio.ends_at)
  const pct = Math.round((sorteio.tickets_sold / sorteio.max_tickets) * 100)
  const badgeColor = BADGE_COLORS[sorteio.badge_color] ?? "#a855f7"
  const totalCost = sorteio.ticket_price * qty
  const available = sorteio.max_tickets - sorteio.tickets_sold

  async function handleBuy() {
    setError("")
    setBuying(true)
    await onBuy(sorteio.id, qty)
    setBuying(false)
    setQty(1)
  }

  return (
    <div className="sorteio-featured-card">
      {/* Esquerda — info */}
      <div className="sorteio-featured-left">
        <div className="sorteio-active-badge">
          <span className="sorteio-active-dot" />
          SORTEIO ATIVO
        </div>
        <div className="sorteio-featured-title-row">
          <h2 className="sorteio-featured-title">{sorteio.title}</h2>
          {sorteio.badge && (
            <span className="sorteio-badge" style={{ background: `color-mix(in srgb, ${badgeColor} 18%, transparent)`, color: badgeColor, border: `1px solid color-mix(in srgb, ${badgeColor} 35%, transparent)` }}>
              {sorteio.badge}
            </span>
          )}
        </div>
        {sorteio.description && <p className="sorteio-featured-desc">{sorteio.description}</p>}

        <div className="sorteio-featured-stats">
          <div className="sorteio-stat-block">
            <span className="sorteio-stat-label">Valor do Ticket</span>
            <span className="sorteio-stat-value">
              <Ticket size={14} style={{ color: "var(--cyan)" }} />
              {sorteio.ticket_price.toLocaleString("pt-BR")} PONTOS
            </span>
          </div>
          <div className="sorteio-stat-block">
            <span className="sorteio-stat-label">Tickets Comprados</span>
            <span className="sorteio-stat-value">
              <Ticket size={13} style={{ color: "var(--gray-500)" }} />
              {sorteio.user_tickets.length}
            </span>
          </div>
        </div>

        {/* Ação de compra */}
        <div className="sorteio-buy-row">
          <div className="sorteio-qty">
            <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}><Minus size={12} /></button>
            <span>{qty}</span>
            <button type="button" onClick={() => setQty(q => Math.min(available, q + 1))} disabled={qty >= available}><Plus size={12} /></button>
          </div>
          <button type="button" className="sorteio-buy-btn" onClick={handleBuy} disabled={buying || available === 0}>
            {buying ? <Loader2 size={14} className="spin" /> : <Ticket size={14} />}
            {buying ? "Comprando..." : available === 0 ? "Esgotado" : `Comprar — ${totalCost.toLocaleString("pt-BR")} pts`}
          </button>
        </div>
        {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#ef4444" }}>{error}</p>}

        {/* Seus números */}
        {sorteio.user_tickets.length > 0 && (
          <div className="sorteio-my-tickets">
            <span className="sorteio-stat-label">Seus Números</span>
            <div className="sorteio-ticket-nums">
              {sorteio.user_tickets.slice(0, 12).map(n => (
                <span key={n} className="sorteio-ticket-num">{String(n).padStart(3, "0")}</span>
              ))}
              {sorteio.user_tickets.length > 12 && (
                <span className="sorteio-ticket-num sorteio-ticket-more">+{sorteio.user_tickets.length - 12}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Centro — imagem */}
      <div className="sorteio-featured-image">
        {sorteio.image_url
          ? <img src={sorteio.image_url} alt={sorteio.title} />
          : <div className="sorteio-image-placeholder"><Trophy size={64} /></div>}
      </div>

      {/* Direita — countdown + progresso */}
      <div className="sorteio-featured-right">
        <span className="sorteio-stat-label">Tempo Restante</span>
        <div className="sorteio-countdown">
          {[{ v: countdown.d, l: "DIAS" }, { v: countdown.h, l: "HORAS" }, { v: countdown.m, l: "MIN" }, { v: countdown.s, l: "SEG" }].map(({ v, l }, i, arr) => (
            <Fragment key={l}>
              <div className="sorteio-countdown-block">
                <span className="sorteio-countdown-num">{pad(v)}</span>
                <span className="sorteio-countdown-label">{l}</span>
              </div>
              {i < arr.length - 1 && <span className="sorteio-countdown-sep">:</span>}
            </Fragment>
          ))}
        </div>

        <div className="sorteio-progress-section">
          <div className="sorteio-progress-header">
            <span className="sorteio-stat-label">Tickets Vendidos</span>
            <span className="sorteio-progress-count">{sorteio.tickets_sold.toLocaleString("pt-BR")} / {sorteio.max_tickets.toLocaleString("pt-BR")}</span>
          </div>
          <div className="sorteio-progress-bar">
            <div className="sorteio-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="sorteio-progress-pct">{pct}%</span>
        </div>

        <div className="sorteio-auto-note">
          <Radio size={12} style={{ flexShrink: 0 }} />
          <span>Sorteio automático quando esgotarem os tickets ou acabar o tempo</span>
        </div>

        <button type="button" className="sorteio-details-btn">
          VER DETALHES DO SORTEIO
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function SorteioCard({ sorteio }: { sorteio: Sorteio }) {
  const badge = STATUS_BADGE[sorteio.status] ?? STATUS_BADGE.upcoming
  const isFinished = sorteio.status === "finished"

  return (
    <div className="sorteio-card">
      <div className="sorteio-card-media">
        {sorteio.image_url
          ? <img src={sorteio.image_url} alt={sorteio.title} loading="lazy" />
          : <div className="sorteio-card-placeholder"><Trophy size={32} /></div>}
        <span className="sorteio-card-status" style={{ background: `color-mix(in srgb, ${badge.color} 18%, rgba(0,0,0,0.7))`, color: badge.color, border: `1px solid color-mix(in srgb, ${badge.color} 30%, transparent)` }}>
          {badge.label}
        </span>
      </div>
      <div className="sorteio-card-body">
        <h3 className="sorteio-card-title">{sorteio.title}</h3>
        {sorteio.description && <p className="sorteio-card-desc">{sorteio.description}</p>}
        {isFinished && sorteio.winner_name ? (
          <>
            <div className="sorteio-card-meta">
              <span className="sorteio-stat-label">Vencedor</span>
              <span className="sorteio-winner-name">
                <Trophy size={11} style={{ color: "#f59e0b" }} />
                {sorteio.winner_name}
              </span>
            </div>
            <div className="sorteio-card-meta">
              <span className="sorteio-stat-label">Finalizado em</span>
              <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                <Ticket size={11} style={{ color: "var(--gray-500)", display: "inline", marginRight: 3 }} />
                {sorteio.drawn_at ? fmtDate(sorteio.drawn_at) : "—"}
              </span>
            </div>
          </>
        ) : (
          <div className="sorteio-card-meta">
            <span className="sorteio-stat-label">{sorteio.status === "upcoming" ? "Início" : "Encerra em"}</span>
            <span style={{ fontSize: 11, color: "var(--paper-dim)" }}>
              {fmtDate(sorteio.status === "upcoming" ? sorteio.starts_at : sorteio.ends_at)}
            </span>
          </div>
        )}
        <button type="button" className="sorteio-card-btn">
          {isFinished ? "VER RESULTADO" : "VER DETALHES"}
        </button>
      </div>
    </div>
  )
}

export function SorteiosTab() {
  const [data, setData]         = useState<SorteiosData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [buyError, setBuyError] = useState("")
  const [filterType, setFilterType] = useState("todos")

  async function load() {
    setLoading(true)
    const res = await fetch("/api/sorteios")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleBuy(sorteioId: string, qty: number) {
    setBuyError("")
    const res = await fetch(`/api/sorteios/${sorteioId}/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    })
    const json = await res.json()
    if (!res.ok) { setBuyError(json.error ?? "Erro ao comprar ticket."); return }
    await load()
  }

  const filtered = (data?.others ?? []).filter(s =>
    filterType === "todos" || s.status === filterType
  )

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 10, color: "var(--gray-500)" }}>
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: 14 }}>Carregando sorteios...</span>
      </div>
    )
  }

  return (
    <div className="sorteios-root">
      {buyError && (
        <div style={{ background: "color-mix(in srgb, #ef4444 12%, transparent)", border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#ef4444", marginBottom: 16 }}>
          {buyError}
        </div>
      )}

      {/* Sorteio ativo em destaque */}
      {data?.active ? (
        <ActiveSorteioCard sorteio={data.active} userPoints={data.user_points} onBuy={handleBuy} />
      ) : (
        <div className="sorteio-empty-active">
          <TrendingUp size={32} style={{ color: "var(--gray-500)", marginBottom: 8 }} />
          <p>Nenhum sorteio ativo no momento.</p>
        </div>
      )}

      {/* Outros sorteios */}
      <div className="sorteio-others-section">
        <div className="sorteio-others-head">
          <div>
            <h3>OUTROS SORTEIOS</h3>
            <p>Confira outros sorteios disponíveis ou em breve.</p>
          </div>
          <div className="sorteio-filters">
            {[
              { key: "todos",    label: "Todos os Tipos" },
              { key: "upcoming", label: "Em Breve" },
              { key: "active",   label: "Ativos" },
              { key: "finished", label: "Finalizados" },
            ].map(f => (
              <button key={f.key} type="button" className={`sorteio-filter-btn${filterType === f.key ? " active" : ""}`} onClick={() => setFilterType(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-500)", fontSize: 13 }}>
            Nenhum sorteio encontrado.
          </div>
        ) : (
          <div className="sorteio-others-grid">
            {filtered.map(s => <SorteioCard key={s.id} sorteio={s} />)}
          </div>
        )}

        {filtered.length > 0 && (
          <button type="button" className="sorteio-see-all-btn">
            VER TODOS OS SORTEIOS
          </button>
        )}
      </div>
    </div>
  )
}

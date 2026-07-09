"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Award, ChevronLeft, ChevronRight, Coins, ExternalLink,
  HelpCircle, ImageOff, Shield, Swords,
  Users, Zap,
} from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../../styles/faccoes-hub.css"
import "../../../../styles/contratos-venda.css"
import type { DashboardData, RepLevel } from "@/app/api/faccoes/dashboard/route"
import type { Contract } from "@/app/api/contratos/route"
import type { Pass } from "@/app/api/faccoes/recompensas/route"
import { ActiveContractCard, expiresInStr } from "@/components/active-contract-card"

const PANEL_KEY = "faccoes-hub-panel-open"

type SchedModal = { contractId: string; objectiveIndex: number; title: string; objective: string }

/* ── helpers ── */
function getRepLevel(rep: number, levels: RepLevel[]) {
  const sorted  = [...levels].sort((a, b) => a.min_points - b.min_points)
  const current = [...sorted].reverse().find(l => rep >= l.min_points) ?? sorted[0]
  const nextIdx = sorted.findIndex(l => l.name === current?.name) + 1
  const next    = sorted[nextIdx] ?? null
  const pct     = next
    ? Math.min(100, Math.round((rep - current.min_points) / (next.min_points - current.min_points) * 100))
    : 100
  return { current, next, pct }
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return "Agora"
  if (m < 60) return `Há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Há ${h}h`
  return `Há ${Math.floor(h / 24)}d`
}

function memberCount(counts: DashboardData["member_counts"], id: string) {
  return counts.find(c => c.faction_id === id)?.count ?? 0
}

/* ── dados decorativos ── */
const WAR_REWARD_ITEMS = [
  { label: "Caixa Lendária de Guerra", icon: Award  },
  { label: "Visual Exclusivo",         icon: Shield },
  { label: "+10% REP por 7 dias",      icon: Zap    },
]


const tabs = ["Visão Geral", "Recompensas", "Guerra de Facções", "Ranking de Facções", "Minha Facção"]

export default function FaccoesHubPage() {
  const router                        = useRouter()
  const [data, setData]               = useState<DashboardData | null>(null)
  const [factionContracts, setFactionContracts] = useState<Contract[]>([])
  const [passes, setPasses]           = useState<Pass[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState(tabs[0])
  const [panelOpen, setPanelOpen]     = useState(false)

  /* ── Modal detalhe do contrato ── */
  const [detailModal, setDetailModal]   = useState<Contract | null>(null)

  /* ── Modal agendamento ── */
  const [schedModal, setSchedModal]     = useState<SchedModal | null>(null)
  const [schedDate, setSchedDate]       = useState("")
  const [schedTime, setSchedTime]       = useState("")
  const [schedGameId, setSchedGameId]   = useState("")
  const [schedTimes, setSchedTimes]     = useState<string[]>([])
  const [scheduling, setScheduling]     = useState(false)
  const [schedMsg, setSchedMsg]         = useState("")

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }
  const tabRefs                       = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator]     = useState({ left: 0, width: 0 })

  useEffect(() => {
    Promise.all([
      fetch("/api/faccoes/dashboard").then(r => r.json()),
      fetch("/api/faccoes/contratos").then(r => r.json()).catch(() => ({ contracts: [] })),
      fetch("/api/faccoes/recompensas").then(r => r.json()).catch(() => ({ passes: [] })),
    ]).then(([d, c, r]: [DashboardData, { contracts: Contract[] }, { passes: Pass[] }]) => {
      if (!d.faction) { router.replace("/faccoes"); return }
      setData(d)
      setFactionContracts(c.contracts ?? [])
      setPasses(r.passes ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router])

  useLayoutEffect(() => {
    function update() {
      const el = tabRefs.current[tabs.indexOf(activeTab)]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeTab])

  function openScheduleModal(contractId: string, objectiveIndex: number, title: string, objective: string) {
    setSchedModal({ contractId, objectiveIndex, title, objective })
    setSchedDate(""); setSchedTime(""); setSchedGameId(""); setSchedTimes([]); setSchedMsg("")
  }

  async function submitSchedule() {
    if (!schedModal) return
    setScheduling(true); setSchedMsg("")
    const res = await fetch(`/api/contratos/${schedModal.contractId}/schedule`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective_index: schedModal.objectiveIndex, scheduled_at: `${schedDate}T${schedTime}:00`, game_id: schedGameId || undefined }),
    })
    setScheduling(false)
    if (res.ok) {
      setSchedMsg("✓ Entrega agendada com sucesso!")
      setTimeout(() => setSchedModal(null), 1800)
    } else {
      const b = await res.json().catch(() => ({}))
      setSchedMsg(b.error ?? "Erro ao agendar.")
    }
  }

  if (loading) return <div style={{ padding: 64, textAlign: "center", color: "var(--gray-500)" }}>Carregando...</div>
  if (!data?.faction) return null

  const { faction, joined_at, member_counts, faction_feed, my_activity, user_profile, rep_levels, faction_influence, user_global_rank, completed_contracts } = data
  const userRep = user_profile?.reputation ?? 0
  const { current: repLevel, next: nextLevel, pct: repPct } = getRepLevel(userRep, rep_levels)
  const totalMembers = memberCount(member_counts, faction.id)
  const userName     = user_profile?.name ?? "Raider"
  const avatarUrl    = user_profile?.avatar_url

  /* bonuses como "vantagens ativas" */
  const vantagens = (faction.bonuses ?? []).filter(b => b.startsWith("+"))

  return (
    <div className={`faccoes-hub-page${panelOpen ? "" : " faccoes-page--panel-closed"}`} style={{ position: "relative" }}>
      <div className={`faccoes-hub-layout${panelOpen ? "" : " faccoes-hub-layout--no-panel"}`}>
        <div className="faccoes-hub-main">

          {/* ── Topbar ── */}
          <div className="faccoes-hub-topbar">
            <div>
              <div className="faccoes-hub-title-row">
                <h1>FACÇÕES</h1>
                <HelpCircle size={18} className="faccoes-hub-help" />
              </div>
              <p className="faccoes-hub-subtitle">As facções moldam o Sucatão. Suas ações impactam o equilíbrio de poder e desbloqueiam recompensas exclusivas.</p>
            </div>
            <div className="faccoes-hub-war-widget">
              <div className="faccoes-hub-war-widget-meta"><Swords size={14} />Guerra de Facções</div>
              <span className="faccoes-hub-war-timer">Termina em: <strong>26d 08h 34m</strong></span>
              <button type="button" className="faccoes-hub-war-refresh" aria-label="Detalhes"><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="faccoes-hub-tabs">
            {tabs.map((tab, i) => (
              <button key={tab} ref={el => { tabRefs.current[i] = el }} type="button"
                className={`faccoes-hub-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
            <span className="faccoes-hub-tab-indicator" style={{ left: indicator.left, width: indicator.width }} />
          </div>

          {activeTab === "Visão Geral" && (
            <>
              {/* ── Linha 1: Informações sobre a facção + Sua Contribuição ── */}
              <div className="faccoes-hub-split-row">
                {/* Banner de informações da facção */}
                <div className="faction-info-banner" style={{ "--faction-color": faction.color } as React.CSSProperties}>
                  <div className="faction-info-banner-glow" />

                  {/* Logo grande à direita */}
                  {faction.icon_url && (
                    <img src={faction.icon_url} alt={faction.name} className="faction-info-banner-logo-right" />
                  )}

                  {/* Conteúdo esquerdo */}
                  <div className="faction-info-banner-left">
                    <div className="faction-info-banner-identity">
                      <div>
                        <h2 className="faction-info-banner-name">{faction.name}</h2>
                        <p className="faction-info-banner-tagline">{faction.tagline}</p>
                      </div>
                    </div>
                    <p className="faction-info-banner-desc">{faction.description}</p>
                    <button type="button" className="faction-info-banner-btn">SAIBA MAIS</button>
                  </div>

                  {/* Stats */}
                  <div className="faction-info-banner-stats">
                    <div className="faction-info-stat-card">
                      <span className="faction-info-stat-label">SUA REPUTAÇÃO</span>
                      <span className="faction-info-stat-value">{userRep.toLocaleString("pt-BR")}</span>
                      <span className="faction-info-stat-badge" style={{ color: repLevel?.color ?? faction.color }}>{repLevel?.name?.toUpperCase() ?? "—"}</span>
                      <div className="faction-info-stat-bar">
                        <div style={{ width: `${repPct}%`, background: repLevel?.color ?? faction.color }} />
                      </div>
                      <span className="faction-info-stat-bar-label">
                        {userRep.toLocaleString("pt-BR")} / {nextLevel ? nextLevel.min_points.toLocaleString("pt-BR") : "MAX"}
                      </span>
                    </div>

                    <div className="faction-info-stat-card">
                      <span className="faction-info-stat-label">INFLUÊNCIA DA {faction.name.toUpperCase()}</span>
                      <span className="faction-info-stat-value" style={{ fontSize: 22 }}>{(faction_influence ?? 0).toLocaleString("pt-BR")}</span>
                      {user_global_rank != null && (
                        <span className="faction-info-stat-sub">SUA POSIÇÃO GLOBAL: #{user_global_rank}</span>
                      )}
                    </div>

                    <div className="faction-info-stat-card">
                      <span className="faction-info-stat-label">OBJETIVO DA SEMANA</span>
                      <span className="faction-info-stat-objective" style={{ color: faction.color }}>RECUPERAR TECNOLOGIA PERDIDA</span>
                      <span className="faction-info-stat-value">76%</span>
                      <span className="faction-info-stat-sub">FALTAM 3 DIAS</span>
                    </div>
                  </div>
                </div>
                <div className="faccoes-hub-contribution">
                  <h2>SUA CONTRIBUIÇÃO</h2>
                  <p className="faccoes-hub-subtitle">Veja o impacto das suas ações na guerra.</p>
                  <div className="faccoes-hub-rank-box">
                    <span className="faccoes-hub-rank-label">POSIÇÃO GLOBAL</span>
                    <span className="faccoes-hub-rank-num">#{(user_global_rank ?? 0).toLocaleString("pt-BR")}</span>
                    <span className="faccoes-hub-rank-sub">Entre os {totalMembers.toLocaleString("pt-BR")} membros da facção</span>
                  </div>
                  <div className="faccoes-hub-stats-row">
                    <div><span>PONTOS CONTRIBUÍDOS</span><strong>{(userRep).toLocaleString("pt-BR")}</strong></div>
                    <div><span>CONTRATOS CONCLUÍDOS</span><strong>{completed_contracts}</strong></div>
                  </div>
                  <button type="button" className="btn-aceitar"
                    style={{ background: faction.color, boxShadow: `0 0 18px ${faction.color}70, 0 2px 8px rgba(0,0,0,0.4)`, color: "rgba(255,255,255,0.95)", marginTop: 12 }}
                    onClick={() => setActiveTab("Ranking de Facções")}>VER MINHA JORNADA</button>
                </div>
              </div>

              {/* ── Linha 2: Contratos ativos de facção + Recompensa da Facção Vencedora ── */}
              <div className="faccoes-hub-split-row">
                {/* Contratos de facção */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 950, textTransform: "uppercase" }}>CONTRATOS ATIVOS DE FACÇÃO</h2>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--paper-dim)" }}>Contratos exclusivos para membros da {faction.name}.</p>
                    </div>
                    <a href="/contratos" style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: faction.color, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      Ver Contratos <ChevronRight size={12} />
                    </a>
                  </div>

                  {factionContracts.length === 0 ? (
                    <div className="faccoes-hub-placeholder-block" style={{ minHeight: 160 }}>
                      <span>Nenhum contrato de facção ativo no momento</span>
                    </div>
                  ) : (
                    <div className="cv-cards-scroll" style={{ paddingBottom: 4 }}>
                      {factionContracts.map(c => {
                        const tierColors: Record<string, { color: string; border: string }> = {
                          "Básico":   { color: "#5fa8ff", border: "rgba(91,166,255,0.4)"  },
                          "Avançado": { color: "#ffd400", border: "rgba(255,196,0,0.4)"   },
                          "Épico":    { color: "#b477ff", border: "rgba(180,119,255,0.4)" },
                          "Lendário": { color: "#ff8c42", border: "rgba(255,140,66,0.4)"  },
                        }
                        const tier = tierColors[c.tier] ?? tierColors["Básico"]
                        const pct  = c.user_progress != null ? Math.round((c.user_progress / c.total) * 100) : 0
                        return (
                          <div key={c.id} className={`cv-card${c.variant ? ` cv-card--${c.variant}` : ""}`}
                            style={{ minWidth: 220, maxWidth: 260, cursor: "pointer" }}
                            onClick={() => setDetailModal(c)}>
                            {c.variant && <div className="cv-card-frame" />}
                            <div className="cv-card-bg">
                              <div className="cv-card-bg-img" style={{ backgroundImage: `url(${c.image_url ?? "/assets/bots/arc_sentinel.png"})` }} />
                            </div>
                            <div className="cv-card-badges">
                              <span className="cv-card-type" style={{ color: faction.color }}>{c.type}</span>
                              <span className="cv-card-tier" style={{ color: tier.color, borderColor: tier.border }}>{c.tier}</span>
                            </div>
                            <div className="cv-card-body">
                              <strong className="cv-card-name">{c.title}</strong>
                              <p className="cv-card-desc">{c.description}</p>
                              <div className="cv-card-section-label">Progresso</div>
                              <div className="ca-progress-wrap">
                                <div className="ca-progress-bar">
                                  <span style={{ width: `${pct}%` }} />
                                </div>
                                <span className="ca-progress-label">{c.user_progress ?? 0}/{c.total}</span>
                              </div>
                              <div className="cv-card-footer-meta" style={{ marginTop: 6 }}>
                                <span className="cv-card-players" style={{ fontSize: 10 }}>
                                  {c.sucatas > 0 && <><Coins size={10} style={{ color: "var(--yellow)" }} />{c.sucatas} pts</>}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{expiresInStr(c.expires_at)}</span>
                              </div>
                              <div className="cv-card-actions">
                                <button type="button" className="btn-aceitar"
                                  style={{ background: faction.color, boxShadow: `0 0 18px ${faction.color}70, 0 2px 8px rgba(0,0,0,0.4)`, color: "rgba(255,255,255,0.95)" }}
                                  onClick={e => { e.stopPropagation(); setDetailModal(c) }}>
                                  <Zap size={14} fill="currentColor" /> Acompanhar Contrato
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="faccoes-hub-objectives">
                  <h2>RECOMPENSA DA FACÇÃO VENCEDORA</h2>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 14 }}>
                    <img src="/assets/items/painted_box.png" alt="Recompensa" style={{ width: 80, height: 80, objectFit: "contain" }} />
                    <ul style={{ listStyle: "none", margin: 0, padding: 0, width: "100%", display: "grid", gap: 6 }}>
                      {WAR_REWARD_ITEMS.map((r, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--paper-dim)", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <r.icon size={14} style={{ color: faction.color, flexShrink: 0 }} />
                          {r.label}
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--gray-500)", textAlign: "center" }}>A recompensa será enviada ao final da guerra.</p>
                  </div>
                </div>
              </div>

              {/* ── Vantagens ── */}
              <div className="faccoes-hub-bottom-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="faccoes-hub-feed-card">
                  <h2>VANTAGENS ATIVAS</h2>
                  <p className="faccoes-hub-subtitle">Benefícios que sua facção desbloqueou para todos os membros.</p>
                  <div className="faccoes-hub-vantagens">
                    {vantagens.map((b, i) => {
                      const match = b.match(/^(\+[\d%]+)\s+(.+)$/)
                      return (
                        <div key={i} className="faccoes-hub-vantagem" style={{ "--faction-color": faction.color } as React.CSSProperties}>
                          <span className="faccoes-hub-vantagem-pct">{match?.[1] ?? b.slice(0, 4)}</span>
                          <span className="faccoes-hub-vantagem-label">{match?.[2] ?? b}</span>
                        </div>
                      )
                    })}
                  </div>
                  <button type="button" className="faction-hub-about-btn" style={{ marginTop: 12 }}>VER TODAS AS VANTAGENS <ChevronRight size={12} /></button>
                </div>
              </div>
            </>
          )}

          {activeTab === "Recompensas" && (
            <div style={{ display: "grid", gap: 24 }}>
              {passes.length === 0 ? (
                <div className="faccoes-hub-placeholder">
                  <h2>Nenhum passe ativo</h2>
                  <p>Seu admin ainda não criou passes de batalha para esta facção.</p>
                </div>
              ) : passes.map(pass => {
                const TYPE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" }
                const TYPE_COLOR: Record<string, string> = { daily: "var(--green)", weekly: "var(--yellow)", monthly: "var(--purple)" }
                const typeColor = TYPE_COLOR[pass.type] ?? "var(--cyan)"
                const expiresIn = (() => {
                  const diff = new Date(pass.expires_at).getTime() - Date.now()
                  if (diff <= 0) return "Expirado"
                  const d = Math.floor(diff / 86400000)
                  const h = Math.floor((diff % 86400000) / 3600000)
                  return d > 0 ? `${d}d ${h}h` : `${h}h`
                })()
                return (
                  <div key={pass.id} style={{ background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "3px 10px", borderRadius: 4, background: `color-mix(in srgb, ${typeColor} 15%, transparent)`, color: typeColor, border: `1px solid color-mix(in srgb, ${typeColor} 30%, transparent)` }}>
                        {TYPE_LABEL[pass.type] ?? pass.type}
                      </span>
                      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 950, color: "var(--paper)" }}>{pass.title}</h2>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--gray-500)" }}>
                        Expira em: <strong style={{ color: typeColor }}>{expiresIn}</strong>
                      </span>
                      <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                        {pass.total_completed}/{pass.missions.length} concluídas
                      </span>
                    </div>

                    {/* Trilha de missões */}
                    <div style={{ padding: "20px", overflowX: "auto" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 0, minWidth: "max-content" }}>
                        {pass.missions.map((m, i) => {
                          const isMilestone = m.position % 5 === 0
                          const nodeColor = m.status === "completed" ? faction.color
                            : m.status === "active" ? faction.color
                            : "rgba(255,255,255,0.15)"
                          const textColor = m.status === "locked" ? "rgba(255,255,255,0.3)" : "var(--paper)"

                          return (
                            <div key={m.id} style={{ display: "flex", alignItems: "center" }}>
                              {/* Nó da missão */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: isMilestone ? 100 : 80 }}>
                                {/* Reward badge acima do nó */}
                                <div style={{ height: 32, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                                  {isMilestone && m.item_reward ? (
                                    <div style={{ background: "rgba(255,212,0,0.15)", border: "1px solid rgba(255,212,0,0.4)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 950, color: "var(--yellow)", display: "flex", alignItems: "center", gap: 4 }}>
                                      🎁 Item
                                    </div>
                                  ) : m.points_reward > 0 ? (
                                    <span style={{ fontSize: 10, color: m.status === "locked" ? "rgba(255,255,255,0.2)" : "var(--yellow)", fontWeight: 800 }}>
                                      +{m.points_reward}pts
                                    </span>
                                  ) : null}
                                </div>

                                {/* Círculo do nó */}
                                <div style={{
                                  width: isMilestone ? 48 : 36,
                                  height: isMilestone ? 48 : 36,
                                  borderRadius: "50%",
                                  background: m.status === "completed"
                                    ? `color-mix(in srgb, ${faction.color} 25%, transparent)`
                                    : m.status === "active"
                                    ? `color-mix(in srgb, ${faction.color} 15%, transparent)`
                                    : "rgba(255,255,255,0.04)",
                                  border: `2px solid ${nodeColor}`,
                                  display: "grid",
                                  placeItems: "center",
                                  position: "relative",
                                  boxShadow: m.status === "active" ? `0 0 16px color-mix(in srgb, ${faction.color} 40%, transparent)` : "none",
                                  transition: "all 0.2s",
                                  flexShrink: 0,
                                }}>
                                  {m.status === "completed"
                                    ? <span style={{ fontSize: isMilestone ? 18 : 14, color: faction.color }}>✓</span>
                                    : m.status === "active"
                                    ? <span style={{ fontSize: isMilestone ? 16 : 12, fontWeight: 950, color: faction.color }}>{m.position}</span>
                                    : <span style={{ fontSize: isMilestone ? 16 : 12, fontWeight: 950, color: "rgba(255,255,255,0.2)" }}>{m.position}</span>
                                  }
                                </div>

                                {/* Título da missão */}
                                <span style={{ fontSize: 10, textAlign: "center", color: textColor, lineHeight: 1.3, maxWidth: isMilestone ? 90 : 70, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {m.title}
                                </span>
                              </div>

                              {/* Conector entre nós */}
                              {i < pass.missions.length - 1 && (
                                <div style={{ width: 24, height: 2, background: pass.missions[i + 1].status === "locked" ? "rgba(255,255,255,0.08)" : `color-mix(in srgb, ${faction.color} 40%, transparent)`, marginTop: -32, flexShrink: 0 }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Missão atual em destaque */}
                    {(() => {
                      const active = pass.missions.find(m => m.status === "active")
                      if (!active) return null
                      const isBlocked = !!active.unlocks_at

                      if (isBlocked) {
                        const unlockDate = new Date(active.unlocks_at!)
                        const diff = unlockDate.getTime() - Date.now()
                        const h = Math.floor(diff / 3600000)
                        const m = Math.floor((diff % 3600000) / 60000)
                        return (
                          <div style={{ margin: "0 20px 20px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>🔒</div>
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--paper-dim)" }}>Próxima missão disponível em</p>
                              <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 950, color: faction.color }}>{h}h {m}m</p>
                              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>Renova à meia-noite (BRT) · {active.title}</p>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div style={{ margin: "0 20px 20px", padding: "14px 16px", background: `color-mix(in srgb, ${faction.color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${faction.color} 25%, transparent)`, borderRadius: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: faction.color }}>Missão atual — #{active.position}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--paper)" }}>{active.title}</p>
                          {active.description && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--paper-dim)" }}>{active.description}</p>}
                          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12 }}>
                            <span style={{ color: "var(--gray-500)" }}>Objetivo: completar <strong style={{ color: "var(--paper)" }}>{active.total}×</strong></span>
                            {active.points_reward > 0 && <span style={{ color: "var(--yellow)" }}>+{active.points_reward} pts ao concluir</span>}
                            {active.item_reward && <span style={{ color: "var(--cyan)" }}>🎁 Item especial ao concluir</span>}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab !== "Visão Geral" && activeTab !== "Recompensas" && (
            <div className="faccoes-hub-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção estará disponível em breve.</p>
            </div>
          )}
        </div>

        {/* ── Sidebar direita ── */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de facções">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          <div className="faction-hub-rep">
            <div className="faction-hub-rep-row">
              <div>
                <span>Minha Facção</span>
                <strong style={{ color: faction.color, fontSize: 14 }}>{faction.name}</strong>
                {joined_at && <span style={{ fontSize: 10, color: "var(--gray-500)" }}>Desde {new Date(joined_at).toLocaleDateString("pt-BR")}</span>}
              </div>
              <div className="faction-hub-rep-badge" style={{ borderColor: `color-mix(in srgb, ${faction.color} 40%, transparent)` }}>
                {faction.icon_url ? <img src={faction.icon_url} alt={faction.name} style={{ width: 28, height: 28, objectFit: "contain" }} /> : <ImageOff size={20} />}
                <span style={{ color: faction.color }}>{totalMembers.toLocaleString("pt-BR")} membros</span>
              </div>
            </div>
          </div>

          {/* Atividade da Facção */}
          <div className="store-side-card">
            <div className="faction-hub-activities-head">
              <h2>Atividade da Facção</h2>
            </div>
            <div className="faction-hub-activity-list">
              {faction_feed.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0 }}>Nenhuma atividade ainda.</p>
              ) : faction_feed.map(a => (
                <div key={a.id} className="faction-hub-activity-item">
                  <div className="faction-hub-activity-img" style={{ background: `color-mix(in srgb, ${faction.color} 15%, #0a0e16)`, border: `1px solid color-mix(in srgb, ${faction.color} 30%, transparent)`, display: "grid", placeItems: "center", borderRadius: "50%" }}>
                    {faction.icon_url ? <img src={faction.icon_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} /> : <Users size={12} style={{ color: faction.color }} />}
                  </div>
                  <div className="faction-hub-activity-body">
                    <p><strong>{a.display_name}</strong> {a.text}</p>
                    {a.points && <span className="faction-hub-activity-pts" style={{ color: faction.color }}>+{a.points.toLocaleString("pt-BR")} pts</span>}
                  </div>
                  <span className="faction-hub-activity-time">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recompensa da guerra */}
          <div className="store-side-card">
            <h2>Recompensa da Guerra</h2>
            <p style={{ margin: "4px 0 10px", fontSize: 11, fontWeight: 950, color: faction.color, textTransform: "uppercase" }}>TOP 10% AO FINAL DA GUERRA</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {WAR_REWARD_ITEMS.map((r, i) => (
                <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid color-mix(in srgb, ${faction.color} 25%, var(--stroke))`, borderRadius: 8, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <r.icon size={18} style={{ color: faction.color }} />
                  <span style={{ fontSize: 9, color: "var(--paper-dim)", textAlign: "center", lineHeight: 1.3 }}>{r.label}</span>
                </div>
              ))}
            </div>
            <button type="button" className="faction-hub-about-btn" style={{ width: "100%", justifyContent: "center" }}>
              VER RECOMPENSAS <ExternalLink size={11} />
            </button>
          </div>
        </aside>

        <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)} aria-label="Abrir painel">
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>

      {/* ── Modal de detalhe do contrato ── */}
      {detailModal && (
        <div className="cdm-overlay" onClick={() => setDetailModal(null)}
          style={{ zIndex: 200, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(7,9,15,0.75)", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 920, maxHeight: "90vh", overflowY: "auto", borderRadius: 14, position: "relative" }}>
            <button type="button" onClick={() => setDetailModal(null)}
              style={{ position: "sticky", top: 0, float: "right", zIndex: 10, margin: "0 0 -36px auto", display: "flex", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(12,16,24,0.9)", color: "var(--paper-dim)", cursor: "pointer", fontSize: 15, alignItems: "center", justifyContent: "center", font: "inherit" }}>
              ✕
            </button>
            <ActiveContractCard raw={detailModal} accentColor={faction.color} onAgendar={(id, idx, title, obj) => { setDetailModal(null); openScheduleModal(id, idx, title, obj) }} />
          </div>
        </div>
      )}

      {/* ── Modal de agendamento ── */}
      {schedModal && (
        <div className="cdm-overlay" onClick={() => { setSchedModal(null); setSchedMsg("") }}>
          <div className="cdm-modal" style={{ maxWidth: 480, gridTemplateColumns: "1fr" }} onClick={e => e.stopPropagation()}>
            <button className="cdm-close" type="button" onClick={() => { setSchedModal(null); setSchedMsg("") }}>✕</button>
            <div className="cdm-left" style={{ padding: 24 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 950 }}>Agendar Entrega</h2>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--paper-dim)" }}>
                {schedModal.title} — {schedModal.objective}
              </p>

              <label style={{ display: "grid", gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--gray-500)", letterSpacing: "0.06em" }}>Data</span>
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={schedDate}
                  onChange={async e => {
                    setSchedDate(e.target.value); setSchedTime("")
                    if (!e.target.value) return
                    const res  = await fetch(`/api/contratos/available-times?date=${e.target.value}`)
                    const body = await res.json().catch(() => ({}))
                    setSchedTimes(body.times ?? [])
                  }}
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "10px 12px", fontSize: 13, borderRadius: 8, font: "inherit", outline: "none", colorScheme: "dark" as const }} />
              </label>

              {schedDate && (
                <div style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--gray-500)", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Horário</span>
                  {schedTimes.length === 0
                    ? <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum horário disponível nesta data.</p>
                    : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {schedTimes.map(t => (
                          <button key={t} type="button" onClick={() => setSchedTime(t)}
                            style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${schedTime === t ? "var(--green)" : "var(--stroke)"}`, background: schedTime === t ? "rgba(61,242,139,0.12)" : "rgba(255,255,255,0.03)", color: schedTime === t ? "var(--green)" : "var(--paper-dim)", fontSize: 12, fontWeight: 950, cursor: "pointer", font: "inherit" }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              )}

              <label style={{ display: "grid", gap: 4, marginBottom: 18 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--gray-500)", letterSpacing: "0.06em" }}>Seu Game ID</span>
                <input type="text" placeholder="Ex: SucataoFan#1234" value={schedGameId} onChange={e => setSchedGameId(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "10px 12px", fontSize: 13, borderRadius: 8, font: "inherit", outline: "none" }} />
              </label>

              {schedMsg && <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, color: schedMsg.startsWith("✓") ? "var(--green)" : "var(--red)" }}>{schedMsg}</p>}

              <button type="button" className="carrinho-checkout-btn"
                disabled={!schedDate || !schedTime || scheduling}
                onClick={submitSchedule}>
                <Zap size={14} fill="currentColor" />
                {scheduling ? "Agendando..." : schedDate && schedTime ? `Confirmar — ${schedDate.split("-").reverse().join("/")} às ${schedTime}` : "Selecione data e horário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
import type { DashboardData } from "@/app/api/faccoes/dashboard/route"
import type { Contract } from "@/app/api/contratos/route"
import type { Pass } from "@/app/api/faccoes/recompensas/route"

const PANEL_KEY = "faccoes-hub-panel-open"

/* ── helpers ── */
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


const EVENTS = [
  { label: "Evento de Double XP",       time: "Começa em 08h 34m" },
  { label: "Comboio de Suprimentos",    time: "Começa em 12h 10m" },
  { label: "Extração Especial",         time: "Começa em 1d 02h"  },
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

  if (loading) return <div style={{ padding: 64, textAlign: "center", color: "var(--gray-500)" }}>Carregando...</div>
  if (!data?.faction) return null

  const { faction, joined_at, member_counts, faction_feed, my_activity, user_profile } = data
  const totalMembers = memberCount(member_counts, faction.id)
  const userName     = user_profile?.name ?? "Raider"
  const avatarUrl    = user_profile?.avatar_url

  /* bonuses como "vantagens ativas" */
  const vantagens = (faction.bonuses ?? []).filter(b => b.startsWith("+"))

  return (
    <div className="faccoes-hub-page" style={{ position: "relative" }}>
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
                      <span className="faction-info-stat-value">18</span>
                      <span className="faction-info-stat-badge" style={{ color: faction.color }}>ESPECIALISTA</span>
                      <div className="faction-info-stat-bar">
                        <div style={{ width: "81%", background: faction.color }} />
                      </div>
                      <span className="faction-info-stat-bar-label">3.240 / 4.000</span>
                    </div>

                    <div className="faction-info-stat-card">
                      <span className="faction-info-stat-label">INFLUÊNCIA DA {faction.name.toUpperCase()}</span>
                      <span className="faction-info-stat-value" style={{ fontSize: 22 }}>24.380.230</span>
                      <span className="faction-info-stat-sub">POSIÇÃO GLOBAL: #421</span>
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
                    <span className="faccoes-hub-rank-label">POSIÇÃO NA FACÇÃO</span>
                    <span className="faccoes-hub-rank-num">#—</span>
                    <span className="faccoes-hub-rank-sub">Entre os {totalMembers.toLocaleString("pt-BR")} membros</span>
                  </div>
                  <div className="faccoes-hub-stats-row">
                    <div><span>PONTOS CONTRIBUÍDOS</span><strong>—</strong></div>
                    <div><span>CONTRATOS CONCLUÍDOS</span><strong>—</strong></div>
                  </div>
                  <button type="button" className="faction-hub-btn" style={{ width: "100%", marginTop: 12, justifyContent: "center" }}>VER MINHA JORNADA</button>
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
                        const expiresIn = c.expires_at ? (() => {
                          const diff = new Date(c.expires_at!).getTime() - Date.now()
                          const d = Math.floor(diff / 86400000)
                          const h = Math.floor((diff % 86400000) / 3600000)
                          return diff > 0 ? `${d}d ${h}h` : "Expirado"
                        })() : "—"
                        return (
                          <div key={c.id} className={`cv-card${c.variant ? ` cv-card--${c.variant}` : ""}`} style={{ minWidth: 220, maxWidth: 260 }}>
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
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{expiresIn}</span>
                              </div>
                              {c.user_status === "completed" && (
                                <span style={{ fontSize: 10, fontWeight: 950, color: "var(--green)", textTransform: "uppercase", marginTop: 6, display: "block" }}>✓ Concluído</span>
                              )}
                              {c.user_status === "active" && (
                                <span style={{ fontSize: 10, fontWeight: 950, color: "var(--yellow)", textTransform: "uppercase", marginTop: 6, display: "block" }}>Em progresso</span>
                              )}
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
                          <r.icon size={14} style={{ color: "var(--yellow)", flexShrink: 0 }} />
                          {r.label}
                        </li>
                      ))}
                    </ul>
                    <p style={{ margin: 0, fontSize: 10, color: "var(--gray-500)", textAlign: "center" }}>A recompensa será enviada ao final da guerra.</p>
                  </div>
                </div>
              </div>

              {/* ── Atividade da Facção + Vantagens ── */}
              <div className="faccoes-hub-bottom-grid">
                <div className="faccoes-hub-feed-card">
                  <h2>ATIVIDADE DA FACÇÃO</h2>
                  <p className="faccoes-hub-subtitle">Acompanhe as ações recentes dos membros da sua facção.</p>
                  <div className="faction-hub-activity-list" style={{ marginTop: 12 }}>
                    {faction_feed.length === 0 ? (
                      <p style={{ color: "var(--gray-500)", fontSize: 12, margin: 0 }}>Nenhuma atividade ainda.</p>
                    ) : faction_feed.map(a => (
                      <div key={a.id} className="faction-hub-activity-item">
                        <div className="faction-hub-activity-img" style={{ background: `color-mix(in srgb, ${faction.color} 15%, #0a0e16)`, border: `1px solid color-mix(in srgb, ${faction.color} 30%, transparent)`, display: "grid", placeItems: "center", borderRadius: "50%" }}>
                          {faction.icon_url ? <img src={faction.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} /> : <Users size={14} style={{ color: faction.color }} />}
                        </div>
                        <div className="faction-hub-activity-body">
                          <p><strong>{a.display_name}</strong> {a.text}</p>
                          {a.points && <span className="faction-hub-activity-pts">+{a.points.toLocaleString("pt-BR")} pontos para a facção</span>}
                        </div>
                        <span className="faction-hub-activity-time">{timeAgo(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="faction-hub-about-btn" style={{ marginTop: 12 }}>VER TODAS AS ATIVIDADES <ChevronRight size={12} /></button>
                </div>

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
                        // Countdown até meia-noite BRT
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

          {/* Atividades recentes */}
          <div className="store-side-card">
            <div className="faction-hub-activities-head">
              <h2>Atividades Recentes</h2>
              <button type="button" className="faction-hub-see-all">Ver Todas <ChevronRight size={12} /></button>
            </div>
            <div className="faction-hub-activity-list">
              {my_activity.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0 }}>Nenhuma atividade ainda.</p>
              ) : my_activity.map(a => (
                <div key={a.id} className="faction-hub-activity-item">
                  <div className="faction-hub-activity-img" style={{ background: `color-mix(in srgb, ${faction.color} 15%, #0a0e16)`, border: `1px solid color-mix(in srgb, ${faction.color} 30%, transparent)`, display: "grid", placeItems: "center", borderRadius: "50%" }}>
                    {faction.icon_url ? <img src={faction.icon_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} /> : <Users size={12} style={{ color: faction.color }} />}
                  </div>
                  <div className="faction-hub-activity-body">
                    <p>Você {a.text}</p>
                    {a.points && <span className="faction-hub-activity-pts">+{a.points.toLocaleString("pt-BR")} pontos</span>}
                  </div>
                  <span className="faction-hub-activity-time">{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos eventos (decorativo) */}
          <div className="store-side-card">
            <div className="faction-hub-activities-head">
              <h2>Próximos Eventos</h2>
              <button type="button" className="faction-hub-see-all">Ver Todos <ChevronRight size={12} /></button>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {EVENTS.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,212,0,0.1)", border: "1px solid rgba(255,212,0,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Zap size={14} style={{ color: "var(--yellow)" }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--paper)" }}>{e.label}</p>
                    <span style={{ fontSize: 11, color: "var(--yellow)" }}>{e.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recompensa da guerra (decorativo) */}
          <div className="store-side-card">
            <h2>Recompensa da Guerra</h2>
            <p style={{ margin: "4px 0 10px", fontSize: 11, fontWeight: 950, color: "var(--yellow)", textTransform: "uppercase" }}>TOP 10% AO FINAL DA GUERRA</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {WAR_REWARD_ITEMS.map((r, i) => (
                <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", borderRadius: 8, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <r.icon size={18} style={{ color: "var(--yellow)" }} />
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
    </div>
  )
}

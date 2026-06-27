"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Award, ChevronRight, Coins, ExternalLink,
  HelpCircle, ImageOff, Shield, Swords,
  Users, Zap,
} from "lucide-react"
import "../../../../styles/faccoes-hub.css"
import "../../../../styles/contratos-venda.css"
import type { DashboardData } from "@/app/api/faccoes/dashboard/route"
import type { Contract } from "@/app/api/contratos/route"

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

const tabs = ["Visão Geral", "Guerra de Facções", "Ranking de Facções", "Recompensas", "Minha Facção"]

export default function FaccoesHubPage() {
  const router                        = useRouter()
  const [data, setData]               = useState<DashboardData | null>(null)
  const [factionContracts, setFactionContracts] = useState<Contract[]>([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState(tabs[0])
  const tabRefs                       = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator]     = useState({ left: 0, width: 0 })

  useEffect(() => {
    Promise.all([
      fetch("/api/faccoes/dashboard").then(r => r.json()),
      fetch("/api/faccoes/contratos").then(r => r.json()).catch(() => ({ contracts: [] })),
    ]).then(([d, c]: [DashboardData, { contracts: Contract[] }]) => {
      if (!d.faction) { router.replace("/faccoes"); return }
      setData(d)
      setFactionContracts(c.contracts ?? [])
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
    <div className="faccoes-hub-page">
      <div className="faccoes-hub-layout">
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
                  {/* Glow decorativo no lado direito (onde ficaria a imagem cinematográfica) */}
                  <div className="faction-info-banner-glow" />

                  {/* Conteúdo esquerdo */}
                  <div className="faction-info-banner-left">
                    <div className="faction-info-banner-identity">
                      {faction.icon_url
                        ? <img src={faction.icon_url} alt={faction.name} className="faction-info-banner-icon" />
                        : <ImageOff size={40} style={{ color: faction.color, opacity: 0.6 }} />}
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

          {activeTab !== "Visão Geral" && (
            <div className="faccoes-hub-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção estará disponível em breve.</p>
            </div>
          )}
        </div>

        {/* ── Sidebar direita ── */}
        <aside className="store-side-panel" aria-label="Painel de facções">
          {/* Perfil do usuário */}
          <div className="store-user-card">
            <div className="store-user-avatar" style={{ background: `color-mix(in srgb, ${faction.color} 20%, #0a0e16)` }}>
              {avatarUrl ? <img src={avatarUrl} alt={userName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : userName[0]?.toUpperCase()}
            </div>
            <div className="store-user-info">
              <strong>{userName}</strong>
              <span className="store-user-online"><span className="store-user-online-dot" />Online</span>
            </div>
          </div>

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
      </div>
    </div>
  )
}

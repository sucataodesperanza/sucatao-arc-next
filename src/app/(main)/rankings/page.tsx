"use client"

import { useLayoutEffect, useRef, useState } from "react"
import {
  Award, BarChart2, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  Coins, Eye, Filter, HelpCircle, Package, Recycle,
  RefreshCw, Scale, Search, Shield, Skull, Star, Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import "../../../styles/rankings.css"

type Player = {
  rank: number
  name: string
  level: number
  faction: string
  rep: string
  sucatas: string
  items: number
  contractLevel: number
  isCurrentUser?: boolean
}

const factionMap: Record<string, { icon: LucideIcon; color: string }> = {
  Mercadores:   { icon: Scale,   color: "#ffd400" },
  Catadores:    { icon: Recycle, color: "#3df28b" },
  "Caçadores":  { icon: Skull,   color: "#ff6171" },
  Vigilantes:   { icon: Eye,     color: "#5fa8ff" },
  Sobreviventes:{ icon: Users,   color: "#b477ff" },
}

const players: Player[] = [
  { rank: 1, name: "Draakaarrysss", level: 42, faction: "Mercadores",  rep: "248.750", sucatas: "48.750", items: 1248, contractLevel: 78, isCurrentUser: true },
  { rank: 2, name: "ViperOne",      level: 39, faction: "Catadores",   rep: "195.250", sucatas: "36.850", items: 952,  contractLevel: 72 },
  { rank: 3, name: "LunaScar",      level: 37, faction: "Caçadores",   rep: "145.000", sucatas: "32.100", items: 874,  contractLevel: 65 },
  { rank: 4, name: "Raider_BR",     level: 35, faction: "Mercadores",  rep: "128.900", sucatas: "28.400", items: 762,  contractLevel: 61 },
  { rank: 5, name: "GhostReconBR",  level: 34, faction: "Catadores",   rep: "112.600", sucatas: "21.950", items: 621,  contractLevel: 58 },
  { rank: 6, name: "ShadowHunter",  level: 33, faction: "Caçadores",   rep: "98.450",  sucatas: "18.200", items: 531,  contractLevel: 52 },
  { rank: 7, name: "IronWolfBR",    level: 32, faction: "Mercadores",  rep: "88.300",  sucatas: "16.700", items: 498,  contractLevel: 49 },
  { rank: 8, name: "Myst",          level: 31, faction: "Catadores",   rep: "75.600",  sucatas: "14.250", items: 412,  contractLevel: 45 },
]

const podiumOrder = [players[1], players[0], players[2]]

const tabs = [
  "Ranking Geral",
  "Sucatas",
  "Itens Entregues",
  "Reputação",
  "Doações (Museu)",
  "Contrato",
  "Facções",
]

const seasonRewards = [
  { tier: "Top 1",   label: "Moldura Exclusiva", icon: Star,    color: "#ffd400" },
  { tier: "Top 10",  label: "Ícone Animado",     icon: BarChart2, color: "#b477ff" },
  { tier: "Top 100", label: "Caixa Épica",       icon: Package, color: "#5fa8ff" },
]

const scoringFactors = [
  { label: "Reputação",        pct: 40, color: "#b477ff", icon: Star    },
  { label: "Sucatas Ganhas",   pct: 30, color: "#ffd400", icon: Coins   },
  { label: "Itens Entregues",  pct: 20, color: "#5fa8ff", icon: Package },
  { label: "Nível do Contrato",pct: 10, color: "#3df28b", icon: Award   },
]

function getRankColor(rank: number) {
  if (rank === 1) return "#ffd400"
  if (rank === 2) return "#b0b8c9"
  return "#cd7f3a"
}

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useLayoutEffect(() => {
    function update() {
      const el = tabRefs.current[tabs.indexOf(activeTab)]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeTab])

  return (
    <div className="rankings-page">
      <div className="rankings-layout">
        <div className="rankings-main">

          {/* Topbar */}
          <div className="rankings-topbar">
            <div>
              <div className="rankings-title-row">
                <h1>Rankings</h1>
                <HelpCircle size={18} className="rankings-help" />
              </div>
              <p className="rankings-subtitle">Veja os Raiders que mais se destacam no Sucatão.</p>
            </div>
            <button type="button" className="rankings-season-btn">
              <Calendar size={14} />
              <div>
                <span className="rankings-season-label">Temporada 1</span>
                <span className="rankings-season-dates">01/05/2026 – 31/05/2026</span>
              </div>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="rankings-tabs">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                ref={el => { tabRefs.current[i] = el }}
                type="button"
                className={`rankings-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <span
              className="rankings-tab-indicator"
              style={{ left: indicator.left, width: indicator.width }}
            />
          </div>

          {activeTab === tabs[0] && (
            <>
              {/* Podium */}
              <div className="rankings-podium">
                <span className="rankings-podium-label">Top 3 da Temporada</span>
                <div className="rankings-podium-stage">
                  {podiumOrder.map((player, i) => {
                    const displayRank = i === 0 ? 2 : i === 1 ? 1 : 3
                    const faction = factionMap[player.faction]
                    return (
                      <div key={player.rank} className={`podium-player podium-rank-${displayRank}`}>
                        <div className="podium-rank-badge">
                          <span>{displayRank}</span>
                        </div>
                        <div
                          className="podium-avatar"
                          style={{
                            background: `${faction?.color}22`,
                            borderColor: faction?.color ?? "var(--stroke)",
                          }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <strong className="podium-name">{player.name}</strong>
                        <div className="podium-stats">
                          <span className="podium-rep">
                            <Star size={11} fill="currentColor" />
                            {player.rep} REP
                          </span>
                          <span className="podium-sucatas">
                            <Coins size={11} />
                            {player.sucatas}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Filters */}
              <div className="rankings-filters">
                <div className="rankings-search-wrap">
                  <Search size={13} />
                  <input type="text" className="rankings-search" placeholder="Buscar Raider..." />
                </div>
                <div className="rankings-select-group">
                  <span>Plataforma</span>
                  <div className="rankings-select-wrap">
                    <select className="rankings-select"><option>Todas</option></select>
                    <ChevronDown size={11} />
                  </div>
                </div>
                <div className="rankings-select-group">
                  <span>Facção</span>
                  <div className="rankings-select-wrap">
                    <select className="rankings-select"><option>Todas</option></select>
                    <ChevronDown size={11} />
                  </div>
                </div>
                <button type="button" className="rankings-filter-btn">
                  <Filter size={12} />
                  Filtros
                </button>
                <span className="rankings-update-timer">
                  <RefreshCw size={12} />
                  Atualização em: <strong>05m 32s</strong>
                </span>
              </div>

              {/* Table */}
              <div className="rankings-table-wrap">
                <table className="rankings-table">
                  <thead>
                    <tr className="rankings-thead-row">
                      <th>Posição</th>
                      <th>Raider</th>
                      <th>Facção</th>
                      <th>Reputação</th>
                      <th>Sucatas Ganhas</th>
                      <th>Itens Entregues</th>
                      <th>Contrato (Nível)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => {
                      const faction = factionMap[player.faction]
                      const FactionIcon = faction?.icon
                      return (
                        <tr
                          key={player.rank}
                          className={`rankings-row${player.isCurrentUser ? " rankings-row-me" : ""}`}
                        >
                          <td>
                            {player.rank <= 3 ? (
                              <div className={`rankings-rank-badge rankings-rank-badge-${player.rank}`}>
                                <span>{player.rank}</span>
                              </div>
                            ) : (
                              <div className="rankings-rank-num">{player.rank}</div>
                            )}
                          </td>
                          <td>
                            <div className="rankings-player-cell">
                              <div
                                className="rankings-player-avatar"
                                style={{
                                  background: `${faction?.color}22`,
                                  borderColor: faction?.color ?? "var(--stroke)",
                                }}
                              >
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <strong className="rankings-player-name">{player.name}</strong>
                                <span className="rankings-player-level">Nível {player.level}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="rankings-faction-cell" style={{ color: faction?.color }}>
                              {FactionIcon && <FactionIcon size={14} />}
                              {player.faction}
                            </div>
                          </td>
                          <td>
                            <span className="rankings-rep-cell">
                              <Star size={13} fill="currentColor" />
                              {player.rep} REP
                            </span>
                          </td>
                          <td>
                            <span className="rankings-sucatas-cell">
                              <Coins size={13} />
                              {player.sucatas}
                            </span>
                          </td>
                          <td>{player.items.toLocaleString("pt-BR")}</td>
                          <td>
                            <div className="rankings-contract-cell">
                              <span>{player.contractLevel}</span>
                              <Award
                                size={14}
                                className={
                                  player.isCurrentUser
                                    ? "rankings-contract-gold"
                                    : "rankings-contract-blue"
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="rankings-pagination">
                <button type="button" className="rankings-page-btn" disabled>
                  <ChevronLeft size={14} />
                </button>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`rankings-page-btn${n === 1 ? " active" : ""}`}
                  >
                    {n}
                  </button>
                ))}
                <span className="rankings-page-dots">...</span>
                <button type="button" className="rankings-page-btn">250</button>
                <button type="button" className="rankings-page-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {activeTab !== tabs[0] && (
            <div className="rankings-placeholder">
              <h2>Em breve</h2>
              <p>Esta seção estará disponível em breve.</p>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <aside className="store-side-panel" aria-label="Painel de rankings">
          <div className="store-user-card">
            <div className="store-user-avatar">
              D
              <span className="store-user-level">42</span>
            </div>
            <div className="store-user-info">
              <strong>Draakaarrysss</strong>
              <span className="store-user-online">
                <span className="store-user-online-dot" />
                Online
              </span>
            </div>
          </div>

          <div className="rankings-rep-widget">
            <div className="rankings-rep-widget-row">
              <div>
                <span className="rankings-rep-widget-label">Reputação</span>
                <strong className="rankings-rep-widget-value">5.250</strong>
              </div>
              <div className="rankings-faction-badge">
                <span>Mercador</span>
                <span>
                  <Shield size={11} fill="currentColor" />
                  Lendário
                </span>
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: "52.5%" }} />
            </div>
          </div>

          <div className="store-side-card">
            <h2>Minha Posição</h2>
            <div className="rankings-my-position">
              <div className="rankings-my-badge">
                <span className="rankings-my-badge-rank">1º</span>
                <span className="rankings-my-badge-pct">Top 0,1%</span>
              </div>
              <div className="rankings-my-stats">
                {[
                  { label: "Reputação",         value: "248.750 REP" },
                  { label: "Sucatas Ganhas",     value: "48.750" },
                  { label: "Itens Entregues",    value: "1.248" },
                  { label: "Nível do Contrato",  value: "78" },
                ].map(stat => (
                  <div key={stat.label} className="rankings-my-stat">
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="store-side-card">
            <div className="rankings-rewards-head">
              <h2>Recompensas da Temporada</h2>
              <button type="button" className="rankings-see-all">
                Ver Todas <ChevronRight size={12} />
              </button>
            </div>
            <div className="rankings-rewards-list">
              {seasonRewards.map(reward => {
                const Icon = reward.icon
                return (
                  <div key={reward.tier} className="rankings-reward-item">
                    <div className="rankings-reward-icon" style={{ color: reward.color, borderColor: `${reward.color}44` }}>
                      <Icon size={20} />
                    </div>
                    <div className="rankings-reward-info">
                      <strong>{reward.tier}</strong>
                      <span>{reward.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="store-side-card rankings-timer-card">
            <Calendar size={16} />
            <div className="rankings-timer-text">
              <span>A temporada termina em:</span>
              <strong>26d 08h 34m</strong>
            </div>
          </div>

          <div className="store-side-card">
            <h2>Sobre os Rankings</h2>
            <p className="rankings-about-text">
              Os rankings são atualizados a cada 10 minutos. A pontuação é baseada em múltiplos fatores:
            </p>
            <div className="rankings-scoring">
              {scoringFactors.map(factor => {
                const Icon = factor.icon
                return (
                  <div key={factor.label} className="rankings-scoring-row">
                    <Icon size={13} style={{ color: factor.color }} />
                    <span>{factor.label}</span>
                    <strong>{factor.pct}%</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

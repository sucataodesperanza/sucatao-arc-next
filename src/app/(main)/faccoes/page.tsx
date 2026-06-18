"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Gem, Hexagon, Recycle, Scale, Skull, Star, Users, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/faccoes.css"

type Faction = {
  id: string
  name: string
  tagline: string
  description: string
  color: string
  icon: LucideIcon
  bonuses: string[]
}

const factions: Faction[] = [
  {
    id: "catadores",
    name: "Catadores",
    tagline: "Recuperamos tudo.",
    description: "Especialistas em coleta e reciclagem. Transformamos sucata em oportunidades.",
    color: "#3df28b",
    icon: Recycle,
    bonuses: [
      "+15% de valor em itens de recursos",
      "-10% de reputação em entregas de recursos",
      "+5% de Sucatas em contratos",
    ],
  },
  {
    id: "mercadores",
    name: "Mercadores",
    tagline: "Comércio é poder.",
    description: "Mestres das negociações e do mercado. Conseguimos o que ninguém mais consegue.",
    color: "#ffd400",
    icon: Scale,
    bonuses: [
      "+15% de Sucatas em todas as vendas",
      "-10% de taxa no mercado",
      "+5% de desconto na Loja do Sucatão",
    ],
  },
  {
    id: "cacadores",
    name: "Caçadores",
    tagline: "Caçamos máquinas. Caçamos lendas.",
    description: "Guerreiros implacáveis. Caçamos ARC e garantimos segurança para todos.",
    color: "#ff6171",
    icon: Skull,
    bonuses: [
      "+15% de dano contra ARC",
      "-10% de reputação em itens de combate",
      "+5% de XP no Contrato do Sucatão",
    ],
  },
  {
    id: "vigilantes",
    name: "Vigilantes",
    tagline: "Conhecimento é arma. Informação é poder.",
    description: "Especialistas em tecnologia e inteligência. Sabemos o que os outros não sabem.",
    color: "#5fa8ff",
    icon: Eye,
    bonuses: [
      "+15% de XP em contratos",
      "-10% de reputação em operações especiais",
      "+5% de chance em itens raros",
    ],
  },
  {
    id: "sobreviventes",
    name: "Sobreviventes",
    tagline: "Unidos sobrevivemos. Divididos caímos.",
    description: "Focados em comunidade e cooperação. A força está na união dos Raiders.",
    color: "#b477ff",
    icon: Users,
    bonuses: [
      "+15% de vida e resistência",
      "-10% de reputação em atividades de grupo",
      "+5% de Sucatas em eventos",
    ],
  },
]

const comparisonRows: { label: string; values: number[] }[] = [
  { label: "Combate", values: [1, 1, 3, 2, 1] },
  { label: "Recursos", values: [3, 2, 1, 1, 2] },
  { label: "Comércio", values: [1, 3, 1, 2, 1] },
  { label: "Tecnologia", values: [1, 1, 1, 3, 2] },
  { label: "Sobrevivência", values: [2, 1, 2, 1, 3] },
]

const factionActivity: { color: string; text: string; timeAgo: string }[] = [
  { color: "#3df28b", text: "Os Catadores concluíram 1.250 entregas hoje", timeAgo: "há 8 min" },
  { color: "#ffd400", text: "Os Mercadores movimentaram 2.4M sucatas", timeAgo: "há 15 min" },
  { color: "#ff6171", text: "Os Caçadores destruíram 3 Titãs ARC", timeAgo: "há 22 min" },
  { color: "#5fa8ff", text: "Os Vigilantes decifraram novos dados", timeAgo: "há 31 min" },
  { color: "#b477ff", text: "Os Sobreviventes completaram 780 resgates", timeAgo: "há 42 min" },
]

const PANEL_KEY = "faccoes-panel-open"

export default function FaccoesPage() {
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null)
  const [confirmFaction, setConfirmFaction] = useState<Faction | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  function handleConfirm() {
    if (confirmFaction) setSelectedFaction(confirmFaction.id)
    setConfirmFaction(null)
  }

  return (
    <div className={`faccoes-page${panelOpen ? "" : " faccoes-page--panel-closed"}`}>
      <div className={`faccoes-layout${panelOpen ? "" : " faccoes-layout--no-panel"}`}>
        <div className="faccoes-main">
          <section className="faccoes-hero" style={{ "--hero-image": "url(/assets/bots/arc_the_queen.png)" } as React.CSSProperties}>
            <div className="faccoes-hero-content">
              <Hexagon size={32} className="faccoes-hero-icon" />
              <h1>Escolha sua Facção</h1>
              <p>Sua escolha definirá seu caminho no Sucatão. Cada facção possui objetivos, recompensas e valores únicos.</p>
              <span className="faccoes-hero-warning">Atenção: essa escolha é permanente e não poderá ser alterada.</span>
              <div className="faccoes-hero-divider">
                <Gem size={10} />
              </div>
              <span className="faccoes-hero-hint">Selecione com sabedoria. O futuro do Sucatão começa agora.</span>
            </div>
          </section>

          <div className="faccoes-grid">
            {factions.map(faction => {
              const isSelected = selectedFaction === faction.id
              return (
                <article key={faction.id} className={`faction-card${isSelected ? " selected" : ""}`} style={{ "--faction-color": faction.color } as React.CSSProperties}>
                  {isSelected && (
                    <span className="faction-selected-badge">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                  <div className="faction-banner">
                    <faction.icon size={64} className="faction-banner-icon" />
                  </div>
                  <div className="faction-body">
                    <h3>{faction.name}</h3>
                    <p className="faction-tagline">{faction.tagline}</p>
                    <p className="faction-description">{faction.description}</p>
                    <div className="faction-bonus">
                      <span className="faction-bonus-label">Bônus da Facção</span>
                      <ul>
                        {faction.bonuses.map((bonus, i) => (
                          <li key={i}>
                            <Gem size={12} />
                            {bonus}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      type="button"
                      className="faction-choose"
                      disabled={selectedFaction !== null}
                      onClick={() => setConfirmFaction(faction)}
                    >
                      {isSelected ? "Selecionada" : "Escolher"}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="faccoes-notices">
            <div className="faccoes-notice faccoes-notice-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>Escolha com Responsabilidade</strong>
                <p>
                  Após escolher sua facção, você terá acesso a contratos exclusivos, recompensas únicas e um caminho próprio dentro do Sucatão.
                  Sua reputação será construída com base nas ações da sua facção. Essa escolha é permanente e não poderá ser alterada.
                </p>
              </div>
            </div>
            <div className="faccoes-notice faccoes-notice-info">
              <div>
                <strong>Não sabe qual escolher?</strong>
                <p>Cada facção oferece vantagens únicas. Explore o Sucatão, conheça as histórias e escolha a que mais combina com você.</p>
                <button type="button" className="faccoes-learn-more">
                  Saiba mais sobre as facções
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de facções">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          <div className="faccoes-reputation">
            <div className="faccoes-reputation-row">
              <div>
                <span>Reputação Geral</span>
                <div className="faccoes-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                  <span>4.9/5.0</span>
                </div>
                <span className="faccoes-merchant-tag">Mercador Lendário</span>
              </div>
              <div className="faccoes-position">
                <span>Posição Global</span>
                <strong>#12</strong>
                <span className="faccoes-top">Top 1%</span>
              </div>
            </div>
            <div className="faccoes-progress">
              <div className="faccoes-progress-label">
                <span>Próximo Nível: Lendário</span>
                <span>8.250 / 10.000 REP</span>
              </div>
              <div className="store-reputation-bar">
                <span style={{ width: "82.5%" }} />
              </div>
            </div>
          </div>

          <div className="store-side-card">
            <h2>O que são as Facções?</h2>
            <p>As facções moldam o futuro do Sucatão. Sua decisão impacta o mercado, os contratos e a história que você irá construir.</p>
            <div className="faccoes-info-art" style={{ backgroundImage: "url(/assets/bots/arc_matriarch.png)" }} />
          </div>

          <div className="store-side-card">
            <h2>Comparativo Rápido</h2>
            <table className="faccoes-compare">
              <thead>
                <tr>
                  <th />
                  {factions.map(faction => (
                    <th key={faction.id} style={{ color: faction.color }}>
                      <faction.icon size={16} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.values.map((value, i) => (
                      <td key={i}>
                        <span className="faccoes-dots">
                          {[1, 2, 3].map(n => (
                            <i key={n} className={n <= value ? "on" : ""} style={{ "--dot-color": factions[i].color } as React.CSSProperties} />
                          ))}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="store-side-card trades-activity-card">
            <div className="faccoes-activity-head">
              <h2>Atividade das Facções</h2>
              <button type="button" className="faccoes-see-details">
                Ver Detalhes
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="faccoes-activity-list">
              {factionActivity.map((activity, i) => (
                <div key={i} className="faccoes-activity-item">
                  <span className="faccoes-activity-dot" style={{ background: activity.color }} />
                  <p>{activity.text}</p>
                  <span>{activity.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>

      {confirmFaction && (
        <div className="trade-confirm-overlay" onClick={() => setConfirmFaction(null)}>
          <div className="trade-confirm-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="trade-confirm-close" aria-label="Fechar" onClick={() => setConfirmFaction(null)}>
              <X size={16} strokeWidth={4} />
            </button>
            <div className="trade-confirm-icon" style={{ background: "rgba(255, 255, 255, 0.06)", border: `1px solid ${confirmFaction.color}`, color: confirmFaction.color }}>
              <confirmFaction.icon size={24} />
            </div>
            <h2>Confirmar Facção</h2>
            <p>
              Você está escolhendo a facção <strong style={{ color: confirmFaction.color }}>{confirmFaction.name}</strong>.
              Essa escolha é permanente e não poderá ser alterada. Tem certeza que deseja continuar?
            </p>
            <div className="trade-confirm-actions">
              <button type="button" className="trade-confirm-cancel" onClick={() => setConfirmFaction(null)}>Cancelar</button>
              <button type="button" className="trade-confirm-accept" onClick={handleConfirm}>Confirmar Escolha</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

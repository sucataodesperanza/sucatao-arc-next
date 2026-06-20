"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { Award, ChevronRight, Coins, ExternalLink, Eye, Gem, HelpCircle, Package, Recycle, Scale, Shield, Skull, Swords, Trophy, UserPlus, Users, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import "../../../../styles/faccoes-hub.css"

type FactionHub = {
  id: string
  name: string
  tagline: string
  description: string
  color: string
  icon: LucideIcon
  bonuses: string[]
  members: string
  image: string
  war: { points: string; percent: number }
}

const factions: FactionHub[] = [
  {
    id: "catadores",
    name: "Catadores",
    tagline: "Recuperamos tudo. Nada se perde.",
    description: "Especialistas em coleta e reciclagem. Transformamos sucata em oportunidades para todos.",
    color: "#3df28b",
    icon: Recycle,
    bonuses: [
      "+15% de valor em itens de recursos",
      "+10% de reputação em entregas de recursos",
      "+5% de Sucatas em contratos",
    ],
    members: "12.458",
    image: "/assets/bots/arc_leaper.png",
    war: { points: "12.750.340", percent: 23 },
  },
  {
    id: "mercadores",
    name: "Mercadores",
    tagline: "Comércio é poder. Conexão é tudo.",
    description: "Mestres das negociações e do mercado. Conseguimos o que ninguém mais consegue.",
    color: "#ffd400",
    icon: Scale,
    bonuses: [
      "+15% de Sucatas em todas as entregas",
      "+10% de reputação em contratos",
      "+5% de desconto na Loja do Sucatão",
    ],
    members: "14.782",
    image: "/assets/bots/arc_spotter.png",
    war: { points: "15.980.420", percent: 29 },
  },
  {
    id: "cacadores",
    name: "Caçadores",
    tagline: "Caçamos máquinas. Caçamos lendas.",
    description: "Guerreiros implacáveis. Caçamos ARC e garantimos segurança para todos.",
    color: "#ff6171",
    icon: Skull,
    bonuses: [
      "+15% de valor em itens de armas",
      "+10% de reputação em itens de combate",
      "+5% de XP no Contrato do Sucatão",
    ],
    members: "11.903",
    image: "/assets/bots/arc_shredder.png",
    war: { points: "11.320.180", percent: 21 },
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
      "+10% de reputação em operações especiais",
      "+5% de chance em itens raros",
    ],
    members: "9.641",
    image: "/assets/bots/arc_snitch.png",
    war: { points: "8.450.920", percent: 15 },
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
      "+10% de reputação em atividades de grupo",
      "+5% de Sucatas em eventos",
    ],
    members: "7.290",
    image: "/assets/bots/arc_the_queen.png",
    war: { points: "6.180.340", percent: 11 },
  },
]

const rewardItems = [
  { label: "Título exclusivo", icon: Award, className: "" },
  { label: "Badge da facção", icon: Shield, className: "" },
  { label: "Moldura exclusiva", icon: Gem, className: "" },
  { label: "2.000 Sucatas para todos", icon: Coins, className: "gold" },
  { label: "+10% REP por 7 dias", icon: Zap, className: "blue" },
]

const howSteps = [
  { icon: UserPlus, title: "Escolha sua facção", desc: "Pick a side and join the fight." },
  { icon: Package, title: "Contribua", desc: "Entregue itens, complete contratos e ganhe pontos para sua facção." },
  { icon: Trophy, title: "Ganhe recompensas", desc: "Ajude sua facção a vencer e receba recompensas exclusivas." },
  { icon: Swords, title: "Guerra de Facções", desc: "A cada mês uma nova guerra começa. Vença todas elas!" },
]

const recentActivities = [
  { image: "/assets/bots/arc_leaper.png", text: "Você entregou 5 Baterias ARC", points: "+350 pontos", timeAgo: "Há 10 min" },
  { image: "/assets/bots/arc_spotter.png", text: "Você completou o contrato \"Coleta de Sucata\"", points: "+250 pontos", timeAgo: "Há 35 min" },
  { image: "/assets/bots/arc_shredder.png", text: "Você entregou 3 Drones ARC", points: "+420 pontos", timeAgo: "Há 1 h" },
  { image: "/assets/bots/arc_snitch.png", text: "Você entregou 10 Itens Comuns", points: "+120 pontos", timeAgo: "Há 2 h" },
]

const tabs = ["Visão Geral", "Guerra de Facções", "Ranking de Facções", "Recompensas", "Minha Facção"]

export default function FaccoesHubPage() {
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
    <div className="faccoes-hub-page">
      <div className="faccoes-hub-layout">
        <div className="faccoes-hub-main">

          {/* Topbar */}
          <div className="faccoes-hub-topbar">
            <div>
              <div className="faccoes-hub-title-row">
                <h1>Facções</h1>
                <HelpCircle size={18} className="faccoes-hub-help" />
              </div>
              <p className="faccoes-hub-subtitle">Escolha seu lado. Complete objetivos, contribua com sua facção e conquiste recompensas exclusivas.</p>
            </div>
            <div className="faccoes-hub-war-widget">
              <div className="faccoes-hub-war-widget-meta">
                <Swords size={14} />
                Guerra de Facções
              </div>
              <span className="faccoes-hub-war-timer">
                Termina em: <strong>26d 08h 34m</strong>
              </span>
              <button type="button" className="faccoes-hub-war-refresh" aria-label="Atualizar">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="faccoes-hub-tabs">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                ref={el => { tabRefs.current[i] = el }}
                type="button"
                className={`faccoes-hub-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
            <span className="faccoes-hub-tab-indicator" style={{ left: indicator.left, width: indicator.width }} />
          </div>

          {activeTab === "Visão Geral" && (
            <>
              {/* Faction cards grid */}
              <div className="faccoes-hub-grid">
                {factions.map(faction => (
                  <article
                    key={faction.id}
                    className="faction-hub-card"
                    style={{ "--faction-color": faction.color } as React.CSSProperties}
                  >
                    <div className="faction-hub-banner" style={{ backgroundImage: `url(${faction.image})` }}>
                      <span className="faction-hub-badge">
                        <faction.icon size={42} />
                      </span>
                    </div>
                    <div className="faction-hub-body">
                      <h3 className="faction-hub-name">{faction.name}</h3>
                      <p className="faction-hub-tagline">{faction.tagline}</p>
                      <p className="faction-hub-description">{faction.description}</p>
                      <div className="faction-hub-bonuses">
                        <span className="faction-hub-bonuses-label">Bônus da Facção</span>
                        <ul>
                          {faction.bonuses.map((bonus, i) => (
                            <li key={i}>
                              <Gem size={10} />
                              {bonus}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="faction-hub-footer">
                        <span className="faction-hub-members">
                          <Users size={13} />
                          {faction.members} membros
                        </span>
                        <button type="button" className="faction-hub-btn" disabled>
                          Escolher Facção
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* War section */}
              <div className="faccoes-hub-war-section">
                <div className="faccoes-hub-war-left">
                  <h2 className="faccoes-hub-war-heading">
                    Guerra de Facções
                    <HelpCircle size={16} className="faccoes-hub-war-heading-help" />
                  </h2>
                  <p className="faccoes-hub-war-desc">As facções competem entre si durante a temporada. Contribua e leve sua facção à vitória!</p>
                  <div className="faccoes-hub-war-bars">
                    {factions.map(faction => (
                      <div
                        key={faction.id}
                        className="faction-hub-war-item"
                        style={{ "--faction-color": faction.color } as React.CSSProperties}
                      >
                        <span className="faction-hub-war-badge">
                          <faction.icon size={22} />
                        </span>
                        <div className="faction-hub-war-info">
                          <div className="faction-hub-war-name-row">
                            <span className="faction-hub-war-name">{faction.name}</span>
                            <span className="faction-hub-war-pts">{faction.war.points}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div className="faction-hub-war-bar" style={{ flex: "1 1 auto" }}>
                              <span style={{ width: `${faction.war.percent}%` }} />
                            </div>
                            <span className="faction-hub-war-pct">{faction.war.percent}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="faccoes-hub-reward-card">
                  <h3 className="faccoes-hub-reward-title">Recompensa da Facção Vencedora</h3>
                  <div className="faccoes-hub-reward-body">
                    <img
                      src="/assets/items/painted_box.png"
                      alt="Recompensa"
                      className="faccoes-hub-reward-img"
                    />
                    <ul className="faccoes-hub-reward-list">
                      {rewardItems.map((item, i) => (
                        <li key={i} className={item.className}>
                          <item.icon size={18} />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="faccoes-hub-reward-note">A recompensa será enviada ao final da guerra.</p>
                </div>
              </div>

              {/* How it works */}
              <div className="faccoes-hub-how">
                <h2 className="faccoes-hub-how-heading">Como Funciona</h2>
                <div className="faccoes-hub-how-steps">
                  {howSteps.map((step, i) => (
                    <div key={i} className="faccoes-hub-how-step">
                      <span className="faccoes-hub-how-num">{i + 1}</span>
                      <step.icon size={22} />
                      <strong>{step.title}</strong>
                      <p>{step.desc}</p>
                    </div>
                  ))}
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

        {/* Sidebar */}
        <aside className="store-side-panel" aria-label="Painel de facções">
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

          <div className="faction-hub-rep">
            <div className="faction-hub-rep-row">
              <div>
                <span>Reputação</span>
                <strong>5.250</strong>
              </div>
              <div className="faction-hub-rep-badge">
                <span>Mercador</span>
                <span>
                  <Shield size={12} fill="currentColor" />
                  Lendário
                </span>
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: "52.5%" }} />
            </div>
          </div>

          <div className="store-side-card">
            <h2>Minha Facção</h2>
            <div className="faction-hub-my-faction">
              <div className="faction-hub-my-faction-header">
                <span className="faction-hub-my-faction-badge">
                  <Recycle size={54} />
                </span>
                <div className="faction-hub-my-faction-meta">
                  <span className="faction-hub-my-faction-name">Catadores</span>
                  <span className="faction-hub-my-faction-since">Membro desde: 10/05/2026</span>
                  <span className="faction-hub-my-faction-role">Cargo: Recruta</span>
                </div>
              </div>
              <div className="faction-hub-my-progress">
                <div className="faction-hub-my-progress-label">
                  <span>Progresso pessoal</span>
                  <span>2.850 / 5.000</span>
                </div>
                <div className="store-reputation-bar">
                  <span style={{ width: "57%" }} />
                </div>
              </div>
              <button type="button" className="faction-hub-my-faction-btn">
                <ChevronRight size={14} />
                Ver Minha Facção
              </button>
            </div>
          </div>

          <div className="store-side-card">
            <div className="faction-hub-activities-head">
              <h2>Atividades Recentes</h2>
              <button type="button" className="faction-hub-see-all">
                Ver Todas
                <ChevronRight size={12} />
              </button>
            </div>
            <div className="faction-hub-activity-list">
              {recentActivities.map((activity, i) => (
                <div key={i} className="faction-hub-activity-item">
                  <img src={activity.image} alt="" className="faction-hub-activity-img" />
                  <div className="faction-hub-activity-body">
                    <p>{activity.text}</p>
                    <span className="faction-hub-activity-pts">{activity.points}</span>
                  </div>
                  <span className="faction-hub-activity-time">{activity.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="store-side-card">
            <h2>Sobre as Facções</h2>
            <p className="faction-hub-about-text">Cada facção possui bônus únicos que ajudam no seu progresso dentro do Sucatão. Escolha com sabedoria!</p>
            <button type="button" className="faction-hub-about-btn">
              Saiba Mais
              <ExternalLink size={12} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

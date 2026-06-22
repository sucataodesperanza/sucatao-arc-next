"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  BadgeCheck, ChevronRight, ExternalLink, Gift, Heart,
  Megaphone, Monitor, Radio, Shield, Star, Trophy, Users, Zap,
} from "lucide-react"
import "../../../styles/streamers.css"

const streamers = [
  { id: "1", name: "Patife",    verified: true,  viewers: "8.2K", color: "#7c3aed", image: "/assets/bots/arc_sentinel.png"  },
  { id: "2", name: "Yoda",      verified: true,  viewers: "5.1K", color: "#3df28b", image: "/assets/bots/arc_shredder.png"  },
  { id: "3", name: "Hayashii",  verified: true,  viewers: "3.7K", color: "#ffd400", image: "/assets/bots/arc_spotter.png"   },
  { id: "4", name: "Marginal",  verified: true,  viewers: "2.9K", color: "#F5090D", image: "/assets/bots/arc_matriarch.png" },
  { id: "5", name: "Bruninzor", verified: false, viewers: "1.8K", color: "#5fa8ff", image: "/assets/bots/arc_leaper.png"    },
]

const benefits = [
  { icon: Shield,   title: "Itens Exclusivos",   text: "Acesso a skins, charms, emblemas e itens exclusivos para parceiros."   },
  { icon: Users,    title: "Apoio no Jogo",       text: "Suporte prioritário da equipe e acesso ao canal exclusivo."             },
  { icon: Star,     title: "Eventos Especiais",   text: "Convites para eventos, lives e partidas exclusivas."                   },
  { icon: Megaphone,title: "Divulgação Oficial",  text: "Destaque nas redes oficiais e dentro do jogo."                         },
  { icon: Gift,     title: "Recompensas",          text: "Ganhe recompensas baseadas no seu engajamento."                        },
]

const steps = [
  { num: 1, title: "Faça lives de ARC Raiders",    text: "Transmita regularmente o jogo em qualquer plataforma de streaming."          },
  { num: 2, title: "Construa sua comunidade",       text: "Mantenha uma comunidade ativa e engajada com seu conteúdo."                  },
  { num: 3, title: "Inscreva-se no programa",       text: "Preencha o formulário e nossa equipe analisará sua inscrição."               },
]

const ranking = [
  { rank: 1, name: "Patife",    verified: true,  game: "Jogando: ARC Raiders", hours: "156h", viewers: "1.2M", points: "24.850" },
  { rank: 2, name: "Yoda",      verified: true,  game: "Jogando: ARC Raiders", hours: "132h", viewers: "985K", points: "21.300" },
  { rank: 3, name: "Hayashii",  verified: true,  game: "Jogando: ARC Raiders", hours: "110h", viewers: "763K", points: "18.420" },
  { rank: 4, name: "Marginal",  verified: false, game: "Jogando: ARC Raiders", hours: "98h",  viewers: "612K", points: "15.670" },
  { rank: 5, name: "Bruninzor", verified: false, game: "Jogando: ARC Raiders", hours: "85h",  viewers: "544K", points: "12.910" },
]

export default function StreamersPage() {
  const carouselRef = useRef<HTMLDivElement>(null)

  function scrollCarousel() {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 220, behavior: "smooth" })
    }
  }

  return (
    <div className="streamers-page">
      <div className="streamers-layout">
        <div className="streamers-main">

          {/* Hero */}
          <div className="streamers-hero">
            <div className="streamers-hero-bg" />
            <div className="streamers-hero-content">
              <h1>Programa <span>de</span> Streamers</h1>
              <p>Parceiros que levam ARC Raiders ainda mais longe.<br />Acompanhe, apoie e ganhe recompensas exclusivas!</p>
            </div>
            <div className="streamers-hero-live">
              <span className="streamers-live-badge">
                <span className="streamers-live-dot" />
                Ao Vivo Agora
              </span>
              <span className="streamers-live-count">286</span>
              <span className="streamers-live-label">
                Streamers ao vivo<br />jogando ARC Raiders
              </span>
            </div>
          </div>

          {/* Featured streamers */}
          <section>
            <div className="streamers-section-head">
              <h2>Streamers em Destaque</h2>
              <a href="#" className="streamers-see-all">Ver todos</a>
            </div>
            <div className="streamers-carousel-wrap">
              <div className="streamers-carousel" ref={carouselRef}>
                {streamers.map(s => (
                  <div key={s.id} className="streamer-card">
                    <div className="streamer-card-thumb" style={{ backgroundImage: `url(${s.image})` }}>
                      <span className="streamer-live-tag">Ao Vivo</span>
                      <span className="streamer-viewers">
                        <Users size={10} />
                        {s.viewers}
                      </span>
                      <div
                        className="streamer-avatar"
                        style={{ background: `${s.color}33`, borderColor: s.color, color: s.color }}
                      >
                        {s.name[0]}
                      </div>
                    </div>
                    <div className="streamer-card-body">
                      <div className="streamer-name-row">
                        <span className="streamer-name">{s.name}</span>
                        {s.verified && <BadgeCheck size={14} className="streamer-verified" />}
                      </div>
                      <p className="streamer-game">Jogando: ARC Raiders</p>
                      <div className="streamer-tags">
                        <span className="streamer-tag">BR</span>
                        <span className="streamer-tag">FPS</span>
                      </div>
                      <button type="button" className="streamer-watch-btn">
                        <Monitor size={12} />
                        Assistir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="streamers-carousel-btn" onClick={scrollCarousel} aria-label="Ver mais">
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          {/* Benefits */}
          <section>
            <div className="streamers-section-head">
              <h2>Benefícios para Parceiros</h2>
            </div>
            <div className="streamers-benefits">
              {benefits.map(b => {
                const Icon = b.icon
                return (
                  <div key={b.title} className="streamer-benefit">
                    <div className="streamer-benefit-icon">
                      <Icon size={18} />
                    </div>
                    <strong>{b.title}</strong>
                    <p>{b.text}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Steps + Ranking */}
          <div className="streamers-bottom-grid">
            <div className="streamers-steps-card">
              <h2>Como se Tornar um Parceiro</h2>
              <div className="streamers-steps">
                {steps.map(step => (
                  <div key={step.num} className="streamer-step">
                    <span className="streamer-step-num">{step.num}</span>
                    <div className="streamer-step-info">
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="#" className="streamers-cta-btn">
                Quero me Inscrever
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="streamers-ranking-card">
              <div className="streamers-ranking-head">
                <h2>Ranking de Parceiros</h2>
                <a href="#" className="streamers-see-all">Ver ranking completo</a>
              </div>
              <table className="streamers-ranking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Streamer</th>
                    <th>Horas Transmitidas</th>
                    <th>Espectadores</th>
                    <th>Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(row => (
                    <tr key={row.rank}>
                      <td>
                        {row.rank <= 3 ? (
                          <div className={`streamer-rank-badge streamer-rank-${row.rank}`}>
                            <span>{row.rank}</span>
                          </div>
                        ) : (
                          <span className="streamer-rank-num">{row.rank}</span>
                        )}
                      </td>
                      <td>
                        <div className="streamer-table-player">
                          <div className="streamer-table-avatar">{row.name[0]}</div>
                          <div>
                            <div className="streamer-table-name">
                              {row.name}
                              {row.verified && <BadgeCheck size={13} style={{ color: "#5fa8ff" }} />}
                            </div>
                            <div className="streamer-table-sub">{row.game}</div>
                          </div>
                        </div>
                      </td>
                      <td>{row.hours}</td>
                      <td>{row.viewers}</td>
                      <td>
                        <span className="streamer-points-cell">
                          <Star size={12} fill="currentColor" />
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <aside className="store-side-panel" aria-label="Painel de streamers">
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

          <div className="store-side-card">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reputação</span>
              <strong style={{ fontSize: 18, fontWeight: 950, color: "var(--paper)" }}>5.250</strong>
              <div style={{ fontSize: 11, color: "var(--gray-500)" }}>/ 10.000 REP</div>
            </div>
            <div className="store-reputation-bar" style={{ marginBottom: 8 }}>
              <span style={{ width: "52.5%", background: "#ffd400" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ffd400" }}>Mercador</span>
              <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Lendário</span>
            </div>
          </div>

          <div className="store-side-card">
            <h2>Apoie seu Streamer Favorito</h2>
            <div className="streamers-support-card">
              <div className="streamers-heart-icon">
                <Heart size={28} fill="currentColor" />
              </div>
              <p className="streamers-support-text">Assista, participe do chat e mostre seu apoio!</p>
              <p className="streamers-support-sub">Quanto mais você interage, mais seu streamer favorito cresce no ranking!</p>
              <a href="#" className="streamers-learn-more">Saiba Mais</a>
            </div>
          </div>

          <div className="store-side-card">
            <h2>Recompensas Globais</h2>
            <div className="streamers-rewards-progress">
              <span className="streamers-rewards-meta">Próxima meta · Meta da Comunidade</span>
              <div className="streamers-rewards-bar-wrap">
                <div className="streamers-rewards-bar-label">
                  <span>15.000.000</span>
                  <span>20.000.000 XP</span>
                </div>
                <div className="streamers-rewards-bar">
                  <span style={{ width: "75%" }} />
                </div>
              </div>
              <div className="streamers-rewards-item">
                <img src="/assets/items/painted_box.png" alt="Recompensa" className="streamers-rewards-img" />
                <div>
                  <div className="streamers-rewards-label">Recompensa</div>
                  <div className="streamers-rewards-name">Caixa de Suprimentos Épica</div>
                </div>
              </div>
              <button type="button" className="streamers-goal-btn">Ao atingir a meta</button>
            </div>
          </div>

          <div className="store-side-card">
            <h2>Conecte Suas Contas</h2>
            <p className="streamers-connect-text">Conecte suas contas para receber recompensas exclusivas no jogo.</p>
            <div className="streamers-connect-platforms">
              <div className="streamers-platform">
                <div className="streamers-platform-icon twitch">T</div>
                <span className="streamers-platform-status connected">Conectado</span>
              </div>
              <div className="streamers-platform">
                <div className="streamers-platform-icon youtube">▶</div>
                <span className="streamers-platform-status connected">Conectado</span>
              </div>
              <div className="streamers-platform">
                <div className="streamers-platform-icon discord">D</div>
                <span className="streamers-platform-status pending">Conectar</span>
              </div>
            </div>
            <a href="#" className="streamers-rules-btn">Ver Regras do Programa</a>
          </div>
        </aside>
      </div>
    </div>
  )
}

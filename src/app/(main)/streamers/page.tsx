"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BadgeCheck, ChevronLeft, ChevronRight, ExternalLink, Gift,
  Heart, Megaphone, Monitor, Shield, Star, Users,
} from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import StreamerApplyModal from "@/components/streamer-apply-modal"
import "../../../styles/streamers.css"
import type { Streamer } from "@/app/api/streamers/route"

const PANEL_KEY = "streamers-panel-open"

const benefits = [
  { icon: Shield,    title: "Itens Exclusivos",  text: "Acesso a skins, charms, emblemas e itens exclusivos para parceiros."  },
  { icon: Users,     title: "Apoio no Jogo",      text: "Suporte prioritário da equipe e acesso ao canal exclusivo."            },
  { icon: Star,      title: "Eventos Especiais",  text: "Convites para eventos, lives e partidas exclusivas."                   },
  { icon: Megaphone, title: "Divulgação Oficial", text: "Destaque nas redes oficiais e dentro do jogo."                        },
  { icon: Gift,      title: "Recompensas",        text: "Ganhe recompensas baseadas no seu engajamento."                       },
]

const steps = [
  { num: 1, title: "Faça lives de ARC Raiders", text: "Transmita regularmente o jogo em qualquer plataforma de streaming."   },
  { num: 2, title: "Construa sua comunidade",   text: "Mantenha uma comunidade ativa e engajada com seu conteúdo."            },
  { num: 3, title: "Inscreva-se no programa",   text: "Preencha o formulário e nossa equipe analisará sua inscrição."        },
]

export default function StreamersPage() {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [streamers, setStreamers]   = useState<Streamer[]>([])
  const [panelOpen, setPanelOpen]   = useState(true)
  const [loading, setLoading]       = useState(true)
  const [applyOpen, setApplyOpen]   = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
    fetch("/api/streamers")
      .then(r => r.json())
      .then(d => { setStreamers(d.streamers ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  function scrollCarousel() {
    carouselRef.current?.scrollBy({ left: 220, behavior: "smooth" })
  }

  return (
    <div className={`streamers-page${panelOpen ? "" : " streamers-page--no-panel"}`}>
      {applyOpen && <StreamerApplyModal onClose={() => setApplyOpen(false)} />}
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="streamers-main">

          {/* Hero */}
          <div className="streamers-hero">
            <div className="streamers-hero-bg" />
            <div className="streamers-hero-content">
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--cyan)", opacity: 0.7 }}>Sucatão</p>
              <h1>Programa <span>de</span> Streamers</h1>
              <p>Parceiros que levam ARC Raiders ainda mais longe.<br />Acompanhe, apoie e ganhe recompensas exclusivas!</p>
            </div>
            <div className="streamers-hero-live">
              <span className="streamers-live-badge">
                <span className="streamers-live-dot" />
                Ao Vivo Agora
              </span>
              <span className="streamers-live-count">{streamers.length > 0 ? streamers.length : "—"}</span>
              <span className="streamers-live-label">Streamers parceiros<br />ativos no programa</span>
            </div>
          </div>

          {/* Streamers em destaque */}
          <section>
            <div className="streamers-section-head">
              <h2>Streamers em Destaque</h2>
            </div>
            {loading ? (
              <div className="streamers-carousel-wrap">
                <div className="streamers-carousel">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="streamer-card skeleton">
                      <div className="streamer-card-thumb skeleton-block" />
                    </div>
                  ))}
                </div>
              </div>
            ) : streamers.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum streamer cadastrado ainda.</p>
            ) : (
              <div className="streamers-carousel-wrap">
                <div className="streamers-carousel" ref={carouselRef}>
                  {streamers.map(s => (
                    <div key={s.id} className="streamer-card">
                      <div className="streamer-card-thumb" style={{ backgroundImage: s.avatar_url ? `url(${s.avatar_url})` : undefined }}>
                        <span className="streamer-live-tag">Parceiro</span>
                        <span className="streamer-viewers">
                          <Users size={10} />
                          {s.viewers_text || "—"}
                        </span>
                        <div className="streamer-avatar" style={{ background: `${s.color}33`, borderColor: s.color, color: s.color }}>
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
                          <span className="streamer-tag" style={{ textTransform: "capitalize" }}>{s.platform}</span>
                        </div>
                        {s.channel_url ? (
                          <Link href={s.channel_url} target="_blank" rel="noopener noreferrer" className="streamer-watch-btn">
                            <Monitor size={12} />
                            Assistir
                          </Link>
                        ) : (
                          <button type="button" className="streamer-watch-btn" disabled style={{ opacity: 0.4 }}>
                            <Monitor size={12} />
                            Assistir
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="streamers-carousel-btn" onClick={scrollCarousel} aria-label="Ver mais">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </section>

          {/* Benefícios */}
          <section>
            <div className="streamers-section-head">
              <h2>Benefícios para Parceiros</h2>
            </div>
            <div className="streamers-benefits">
              {benefits.map(b => {
                const Icon = b.icon
                return (
                  <div key={b.title} className="streamer-benefit">
                    <div className="streamer-benefit-icon"><Icon size={18} /></div>
                    <strong>{b.title}</strong>
                    <p>{b.text}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Como se tornar + Ranking */}
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
              <button type="button" onClick={() => setApplyOpen(true)} className="streamers-cta-btn">
                Quero me Inscrever
                <ExternalLink size={14} />
              </button>
            </div>

            <div className="streamers-ranking-card">
              <div className="streamers-ranking-head">
                <h2>Parceiros Cadastrados</h2>
              </div>
              <table className="streamers-ranking-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Streamer</th>
                    <th>Plataforma</th>
                    <th>Viewers</th>
                  </tr>
                </thead>
                <tbody>
                  {streamers.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        {i < 3 ? (
                          <div className={`streamer-rank-badge streamer-rank-${i + 1}`}><span>{i + 1}</span></div>
                        ) : (
                          <span className="streamer-rank-num">{i + 1}</span>
                        )}
                      </td>
                      <td>
                        <div className="streamer-table-player">
                          <div className="streamer-table-avatar" style={{ borderColor: s.color, color: s.color }}>
                            {s.avatar_url
                              ? <img src={s.avatar_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                              : s.name[0]}
                          </div>
                          <div>
                            <div className="streamer-table-name">
                              {s.name}
                              {s.verified && <BadgeCheck size={13} style={{ color: "#5fa8ff" }} />}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textTransform: "capitalize" }}>{s.platform}</td>
                      <td><span className="streamer-points-cell"><Users size={12} />{s.viewers_text || "—"}</span></td>
                    </tr>
                  ))}
                  {streamers.length === 0 && !loading && (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: 16, fontSize: 12 }}>Nenhum streamer cadastrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de streamers">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats />

          <div className="store-side-card">
            <h2>Apoie seu Streamer Favorito</h2>
            <div className="streamers-support-card">
              <div className="streamers-heart-icon"><Heart size={28} fill="currentColor" /></div>
              <p className="streamers-support-text">Assista, participe do chat e mostre seu apoio!</p>
              <p className="streamers-support-sub">Quanto mais você interage, mais seu streamer favorito cresce no ranking!</p>
            </div>
          </div>

          {streamers.length > 0 && (
            <div className="store-side-card">
              <h2>Top Streamers</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {streamers.slice(0, 5).map((s, i) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 18, fontSize: 11, fontWeight: 950, color: i < 3 ? "var(--yellow)" : "var(--gray-500)", textAlign: "center" }}>{i + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${s.color}`, background: `${s.color}22`, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950, color: s.color, flexShrink: 0, overflow: "hidden" }}>
                      {s.avatar_url
                        ? <img src={s.avatar_url} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : s.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: "var(--gray-500)" }}>{s.viewers_text} viewers</p>
                    </div>
                    {s.verified && <BadgeCheck size={12} style={{ color: "#5fa8ff", flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="store-side-card">
            <h2>Conecte Suas Contas</h2>
            <p className="streamers-connect-text">Conecte suas contas para receber recompensas exclusivas no jogo.</p>
            <div className="streamers-connect-platforms">
              {[{ key: "twitch", label: "T", name: "Twitch" }, { key: "youtube", label: "▶", name: "YouTube" }, { key: "kick", label: "K", name: "Kick" }].map(p => (
                <div key={p.key} className="streamers-platform">
                  <div className={`streamers-platform-icon ${p.key}`}>{p.label}</div>
                  <span className="streamers-platform-status pending">Conectar</span>
                </div>
              ))}
            </div>
            <a href="#" className="streamers-rules-btn">Ver Regras do Programa</a>
          </div>
        </aside>

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>
    </div>
  )
}

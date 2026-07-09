"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, Gem, Hexagon, ImageOff, Star, X } from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/faccoes.css"
import type { Faction } from "@/app/api/faccoes/route"
import type { FactionActivity } from "@/app/api/faccoes/activity/route"
import type { UserFaction } from "@/app/api/faccoes/my/route"

// Labels dos atributos do comparativo (ordem fixa)
const ATTRIBUTE_LABELS: { key: string; label: string }[] = [
  { key: "combate",       label: "Combate"       },
  { key: "recursos",      label: "Recursos"      },
  { key: "comercio",      label: "Comércio"      },
  { key: "tecnologia",    label: "Tecnologia"    },
  { key: "sobrevivencia", label: "Sobrevivência" },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return "agora"
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

const PANEL_KEY = "faccoes-panel-open"

export default function FaccoesPage() {
  const router = useRouter()
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1"
  const [factions, setFactions]         = useState<Faction[]>([])
  const [userFaction, setUserFaction]   = useState<UserFaction | null | undefined>(undefined)
  const [activity, setActivity]         = useState<FactionActivity[]>([])
  const [loading, setLoading]           = useState(true)
  const [confirmFaction, setConfirmFaction] = useState<Faction | null>(null)
  const [joining, setJoining]           = useState(false)
  const [joinError, setJoinError]       = useState("")
  const [panelOpen, setPanelOpen]       = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  useEffect(() => {
    // Verifica primeiro se tem facção — se sim, navega sem atualizar estado,
    // mantendo userFaction === undefined (return null) até a navegação concluir.
    fetch("/api/faccoes/my")
      .then(r => r.json())
      .then(ud => {
        if (ud.faction && !isPreview) {
          router.replace("/faccoes/visao-geral")
          return
        }
        // Só carrega o resto quando confirmado que não tem facção
        Promise.all([
          fetch("/api/faccoes").then(r => r.json()).catch(() => ({ factions: [] })),
          fetch("/api/faccoes/activity").then(r => r.json()).catch(() => ({ activity: [] })),
        ]).then(([fd, ad]) => {
          setFactions(fd.factions ?? [])
          setUserFaction(null)
          setActivity(ad.activity ?? [])
          setLoading(false)
        })
      })
      .catch(() => {
        setUserFaction(null)
        setLoading(false)
      })
  }, [])

  async function handleConfirm() {
    if (!confirmFaction) return
    setJoining(true)
    setJoinError("")
    const res = await fetch(`/api/faccoes/${confirmFaction.id}/join`, { method: "POST" })
    setJoining(false)
    if (res.ok) {
      router.push("/faccoes/visao-geral")
    } else {
      const body = await res.json().catch(() => ({}))
      setJoinError(body.error ?? "Erro ao ingressar na facção.")
    }
  }

  // Enquanto userFaction === undefined, ainda não sabemos se o usuário tem facção.
  // Não renderiza nada para evitar o flash da tela de seleção.
  if (userFaction === undefined) return null

  const myFactionId = userFaction?.factions?.id ?? null
  const hasJoined   = myFactionId !== null

  return (
    <div className={`faccoes-page${panelOpen ? "" : " faccoes-page--panel-closed"}`} style={{ position: "relative" }}>
      <div className={`faccoes-layout${panelOpen ? "" : " faccoes-layout--no-panel"}`}>
        <div className="faccoes-main">
          <section className="faccoes-hero" style={{ "--hero-image": "url(/assets/bots/arc_the_queen.png)" } as React.CSSProperties}>
            <div className="faccoes-hero-content">
              <Hexagon size={24} className="faccoes-hero-icon" />
              <h1>Escolha sua Facção</h1>
              <p>Sua escolha definirá seu caminho no Sucatão. Cada facção possui objetivos, recompensas e valores únicos.</p>
            </div>
            <div className="faccoes-hero-warning">
              <AlertTriangle size={20} />
              <div className="faccoes-hero-warning-text">
                <strong>Escolha Permanente</strong>
                <span>Após escolher, não será possível trocar de facção. Decida com sabedoria.</span>
              </div>
            </div>
          </section>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--gray-500)" }}>Carregando facções...</div>
          ) : (
            <div className="faccoes-grid">
              {factions.map(faction => {
                const isSelected = myFactionId === faction.id
                return (
                  <article key={faction.id} className={`faction-card${isSelected ? " selected" : ""}`} style={{ "--faction-color": faction.color } as React.CSSProperties}>
                    {isSelected && (
                      <span className="faction-selected-badge"><Check size={14} strokeWidth={3} /></span>
                    )}
                    <div className="faction-banner">
                      {faction.icon_url
                        ? <img src={faction.icon_url} alt={faction.name} style={{ width: 120, height: 120, objectFit: "contain", position: "relative", zIndex: 1, filter: `drop-shadow(0 0 24px ${faction.color})`, transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), filter 0.35s ease" }} />
                        : <ImageOff size={72} style={{ opacity: 0.3, color: faction.color, position: "relative", zIndex: 1 }} />}
                    </div>
                    <div className="faction-body">
                      <h3>{faction.name}</h3>
                      <p className="faction-tagline">{faction.tagline}</p>
                      <p className="faction-description">{faction.description}</p>
                      {faction.story && (
                        <div className="faction-story">
                          <span className="faction-story-label">História</span>
                          <p>{faction.story}</p>
                        </div>
                      )}
                      <div className="faction-bonus">
                        <span className="faction-bonus-label">Bônus da Facção</span>
                        <ul>
                          {(faction.bonuses ?? []).map((bonus, i) => (
                            <li key={i}><Gem size={12} />{bonus}</li>
                          ))}
                        </ul>
                      </div>
                      <button
                        type="button"
                        className="faction-choose"
                        disabled={hasJoined}
                        onClick={() => { setJoinError(""); setConfirmFaction(faction) }}
                      >
                        {isSelected ? "Selecionada" : hasJoined ? "Indisponível" : "Escolher"}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <div className="faccoes-notices">
            <div className="faccoes-notice faccoes-notice-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>Escolha com Responsabilidade</strong>
                <p>Após escolher sua facção, você terá acesso a contratos exclusivos, recompensas únicas e um caminho próprio dentro do Sucatão. Essa escolha é permanente e não poderá ser alterada.</p>
              </div>
            </div>
            <div className="faccoes-notice faccoes-notice-info">
              <div>
                <strong>Não sabe qual escolher?</strong>
                <p>Cada facção oferece vantagens únicas. Explore o Sucatão, conheça as histórias e escolha a que mais combina com você.</p>
                <button type="button" className="faccoes-learn-more">
                  Saiba mais sobre as facções <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Painel lateral ── */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de facções">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          {userFaction ? (
            <div className="faccoes-reputation">
              <div className="faccoes-reputation-row">
                <div>
                  <span>Sua Facção</span>
                  <strong style={{ color: userFaction.factions?.color, fontSize: 16 }}>{userFaction.factions?.name}</strong>
                  <span className="faccoes-merchant-tag" style={{ color: userFaction.factions?.color }}>Membro</span>
                </div>
                <div className="faccoes-position">
                  <span>Desde</span>
                  <strong style={{ fontSize: 12 }}>{new Date(userFaction.joined_at).toLocaleDateString("pt-BR")}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="faccoes-reputation">
              <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Você ainda não escolheu uma facção.</p>
            </div>
          )}

          <div className="store-side-card">
            <h2>O que são as Facções?</h2>
            <p>As facções moldam o futuro do Sucatão. Sua decisão impacta o mercado, os contratos e a história que você irá construir.</p>
            <div className="faccoes-info-art" style={{ backgroundImage: "url(/assets/bots/arc_matriarch.png)" }} />
          </div>

          {factions.length > 0 && (
            <div className="store-side-card">
              <h2>Comparativo Rápido</h2>
              <table className="faccoes-compare">
                <thead>
                  <tr>
                    <th />
                    {factions.map(f => (
                      <th key={f.id} style={{ color: f.color }}>
                        {f.icon_url
                          ? <img src={f.icon_url} alt={f.name} style={{ width: 16, height: 16, objectFit: "contain" }} />
                          : <span style={{ fontSize: 10 }}>{f.name[0]}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTRIBUTE_LABELS.map(({ key, label }) => (
                    <tr key={key}>
                      <td>{label}</td>
                      {factions.map(f => {
                        const value = (f.attributes as Record<string, number>)?.[key] ?? 1
                        return (
                          <td key={f.id}>
                            <span className="faccoes-dots">
                              {[1, 2, 3].map(n => (
                                <i key={n} className={n <= value ? "on" : ""} style={{ "--dot-color": f.color } as React.CSSProperties} />
                              ))}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="store-side-card trades-activity-card">
            <div className="faccoes-activity-head">
              <h2>Atividade das Facções</h2>
              <button type="button" className="faccoes-see-details">
                Ver Detalhes <ChevronRight size={14} />
              </button>
            </div>
            <div className="faccoes-activity-list">
              {activity.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhuma atividade registrada.</p>
              ) : activity.map(a => (
                <div key={a.id} className="faccoes-activity-item">
                  <span className="faccoes-activity-dot" style={{ background: a.factions?.color ?? "var(--gray-500)" }} />
                  <p>{a.text}</p>
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} /><span>Painel</span>
        </button>
      </div>

      {/* ── Modal de confirmação ── */}
      {confirmFaction && (
        <div className="trade-confirm-overlay" onClick={() => { setConfirmFaction(null); setJoinError("") }}>
          <div className="trade-confirm-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="trade-confirm-close" aria-label="Fechar" onClick={() => { setConfirmFaction(null); setJoinError("") }}>
              <X size={16} strokeWidth={4} />
            </button>
            <div className="trade-confirm-icon" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${confirmFaction.color}`, color: confirmFaction.color }}>
              {confirmFaction.icon_url
                ? <img src={confirmFaction.icon_url} alt={confirmFaction.name} style={{ width: 32, height: 32, objectFit: "contain" }} />
                : <Hexagon size={24} />}
            </div>
            <h2>Confirmar Facção</h2>
            <p>
              Você está escolhendo a facção <strong style={{ color: confirmFaction.color }}>{confirmFaction.name}</strong>.
              Essa escolha é permanente e não poderá ser alterada. Tem certeza que deseja continuar?
            </p>
            {joinError && <p style={{ color: "var(--red)", fontSize: 12, fontWeight: 800, margin: "8px 0 0" }}>{joinError}</p>}
            <div className="trade-confirm-actions">
              <button type="button" className="trade-confirm-cancel" onClick={() => { setConfirmFaction(null); setJoinError("") }}>Cancelar</button>
              <button type="button" className="trade-confirm-accept" disabled={joining} onClick={handleConfirm}>
                {joining ? "Ingressando..." : "Confirmar Escolha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

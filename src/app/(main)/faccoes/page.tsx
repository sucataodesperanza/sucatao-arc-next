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
  const [panelOpen, setPanelOpen]       = useState(true)

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
    <div className={`faccoes-page${panelOpen ? "" : " faccoes-page--panel-closed"}`}>
      <div className={`faccoes-layout${panelOpen ? "" : " faccoes-layout--no-panel"}`}>
        <div className="faccoes-main">

          {/* ── Hero compacto ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "20px 0 28px", borderBottom: "1px solid var(--stroke)", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Hexagon size={28} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--cyan)", opacity: 0.7 }}>Sucatão</p>
                <h1 style={{ margin: "2px 0 4px", fontSize: 26, fontWeight: 950, textTransform: "uppercase", lineHeight: 1 }}>Escolha sua Facção</h1>
                <p style={{ margin: 0, fontSize: 13, color: "var(--paper-dim)" }}>Sua escolha definirá seu caminho no Sucatão. Cada facção possui objetivos únicos.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)", borderRadius: 8, padding: "10px 16px", flexShrink: 0 }}>
              <AlertTriangle size={14} style={{ color: "var(--yellow)", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--yellow)", fontWeight: 800 }}>Escolha permanente e irreversível</span>
            </div>
          </div>

          {/* ── Cards horizontais ── */}
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--gray-500)" }}>Carregando facções...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {factions.map(faction => {
                const isSelected = myFactionId === faction.id
                const attrs = (faction.attributes ?? {}) as Record<string, number>
                return (
                  <article key={faction.id}
                    style={{ "--faction-color": faction.color, position: "relative", border: `1px solid ${isSelected ? faction.color : "var(--stroke)"}`, borderRadius: 12, background: isSelected ? `color-mix(in srgb, ${faction.color} 6%, var(--surface))` : "var(--surface)", overflow: "hidden", transition: "border-color 0.2s" } as React.CSSProperties}
                    className="faccao-card-h">

                    {/* Linha colorida no topo */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: faction.color, opacity: isSelected ? 1 : 0.4 }} />

                    {/* Conteúdo principal (sempre visível) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 24px" }}>
                      {/* Logo */}
                      <div style={{ width: 80, height: 80, flexShrink: 0, display: "grid", placeItems: "center", background: `color-mix(in srgb, ${faction.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${faction.color} 30%, transparent)`, borderRadius: 12 }}>
                        {faction.icon_url
                          ? <img src={faction.icon_url} alt={faction.name} style={{ width: 52, height: 52, objectFit: "contain", filter: `drop-shadow(0 0 8px ${faction.color}88)` }} />
                          : <ImageOff size={32} style={{ color: faction.color, opacity: 0.4 }} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2 }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 950, textTransform: "uppercase", color: faction.color }}>{faction.name}</h3>
                          {isSelected && <span style={{ fontSize: 10, fontWeight: 950, background: `${faction.color}22`, color: faction.color, border: `1px solid ${faction.color}44`, borderRadius: 4, padding: "2px 7px" }}>Sua facção</span>}
                        </div>
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--paper-dim)", fontStyle: "italic" }}>{faction.tagline}</p>
                        {/* Atributos */}
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {ATTRIBUTE_LABELS.map(({ key, label }) => {
                            const val = attrs[key] ?? 1
                            return (
                              <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 10, color: "var(--gray-500)", width: 68 }}>{label}</span>
                                <div style={{ display: "flex", gap: 3 }}>
                                  {[1,2,3].map(n => <span key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: n <= val ? faction.color : "rgba(255,255,255,0.1)", display: "block", transition: "background 0.2s" }} />)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Botão */}
                      <button type="button" disabled={hasJoined && !isSelected}
                        onClick={() => { if (!hasJoined) { setJoinError(""); setConfirmFaction(faction) } }}
                        style={{ flexShrink: 0, padding: "10px 24px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.08em", border: `1px solid ${isSelected ? faction.color : "rgba(255,255,255,0.15)"}`, background: isSelected ? `color-mix(in srgb, ${faction.color} 15%, transparent)` : "rgba(255,255,255,0.04)", color: isSelected ? faction.color : "var(--paper)", borderRadius: 8, cursor: hasJoined ? "default" : "pointer", font: "inherit", opacity: hasJoined && !isSelected ? 0.3 : 1, transition: "all 0.2s" }}>
                        {isSelected ? "Selecionada" : hasJoined ? "Indisponível" : "Escolher →"}
                      </button>
                    </div>

                    {/* Seção expandível (hover) */}
                    <div className="faccao-expand">
                      <div style={{ padding: "0 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gray-500)" }}>Sobre a facção</p>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--paper-dim)", lineHeight: 1.6 }}>{faction.description}</p>
                        </div>
                        <div>
                          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gray-500)" }}>Bônus da facção</p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                            {(faction.bonuses ?? []).map((bonus, i) => (
                              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: "var(--paper-dim)" }}>
                                <Gem size={11} style={{ color: faction.color, flexShrink: 0, marginTop: 2 }} />
                                {bonus}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
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

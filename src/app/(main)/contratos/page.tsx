"use client"

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  BarChart2, Check, ChevronLeft, ChevronRight, Clock, Coins, Crosshair,
  HelpCircle, ScrollText, Shield, Star, Target, Trophy, Users, Wallet, XCircle, Zap,
} from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/contratos.css"
import "../../../styles/contratos-venda.css"
import type { Contract as ApiContract } from "@/app/api/contratos/route"
import type { HistoryItem } from "@/app/api/contratos/history/route"
import { ActiveContractCard, MISSION_COLORS, TIER_COLORS, RISK_COLORS, expiresInStr } from "@/components/active-contract-card"

/* ── Constantes ── */
const MISSION_LABELS: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" }

const tabs = ["Contratos Ativos", "Histórico"] as const
type Tab   = typeof tabs[number]

/* ── Tipos locais ── */
type BuyModal = { contract: ApiContract; step: "choose" | "points" | "cash" }
type SchedModal = { contractId: string; objectiveIndex: number; title: string; objective: string }

/* ── RewardBadge ── */
function RewardBadge({ sucatas, xp, rep }: { sucatas: number; xp: number; rep: number | null }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {sucatas > 0 && <span style={{ color: "#ffd400", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Coins size={11} />{sucatas.toLocaleString("pt-BR")}</span>}
      {xp     > 0 && <span style={{ color: "#5fa8ff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Zap size={11} />{xp}</span>}
      {rep       && <span style={{ color: "#b477ff", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><Star size={11} />{rep}</span>}
    </div>
  )
}

const PANEL_KEY = "contratos-panel-open"

export default function ContratosPage() {
  const [panelOpen, setPanelOpen]     = useState(false)
  const [activeTab, setActiveTab]     = useState<Tab>("Contratos Ativos")
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator]     = useState({ left: 0, width: 0 })

  // Contratos
  const [apiContracts, setApiContracts]       = useState<ApiContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [acceptingId, setAcceptingId]         = useState<string | null>(null)
  const [buyModal, setBuyModal]               = useState<BuyModal | null>(null)
  const [userPoints, setUserPoints]           = useState<number | null>(null)
  const [buyingId, setBuyingId]               = useState<string | null>(null)
  const [detailModal, setDetailModal]         = useState<ApiContract | null>(null)

  // Histórico
  const [history, setHistory]                 = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory]   = useState(false)

  // Agendamento
  const [schedModal, setSchedModal]           = useState<SchedModal | null>(null)
  const [schedDate, setSchedDate]             = useState("")
  const [schedTime, setSchedTime]             = useState("")
  const [schedGameId, setSchedGameId]         = useState("")
  const [schedTimes, setSchedTimes]           = useState<string[]>([])
  const [scheduling, setScheduling]           = useState(false)
  const [schedMsg, setSchedMsg]               = useState("")

  // Painel lateral
  const [userSucatas, setUserSucatas]         = useState<number | null>(null)
  const [contractStats, setContractStats]     = useState<{ completed: number; failed: number; expired: number; total: number; success_rate: number } | null>(null)
  const [pointRewards, setPointRewards]       = useState<any[]>([])

  /* ── Loads ── */
  const loadContracts = useCallback(async () => {
    setLoadingContracts(true)
    const res  = await fetch("/api/contratos")
    const body = await res.json().catch(() => ({ contracts: [] }))
    setApiContracts(body.contracts ?? [])
    setLoadingContracts(false)
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    const res  = await fetch("/api/contratos/history")
    const body = await res.json().catch(() => ({ history: [] }))
    setHistory(body.history ?? [])
    setLoadingHistory(false)
  }, [])

  useEffect(() => { loadContracts() }, [loadContracts])

  useEffect(() => {
    fetch("/api/profile/points").then(r => r.json()).then(d => setUserSucatas(d.points ?? 0)).catch(() => {})
    fetch("/api/contratos/stats").then(r => r.json()).then(d => setContractStats(d)).catch(() => {})
    fetch("/api/contratos/rewards").then(r => r.json()).then(d => setPointRewards(d.rewards ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  useEffect(() => {
    if (activeTab === "Histórico" && history.length === 0) loadHistory()
  }, [activeTab])

  function setPanel(v: boolean) { setPanelOpen(v); localStorage.setItem(PANEL_KEY, String(v)) }

  useLayoutEffect(() => {
    function update() {
      const el = tabRefs.current[tabs.indexOf(activeTab)]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [activeTab])

  /* ── Ações ── */
  async function handleAcceptFree(id: string) {
    setAcceptingId(id)
    const res = await fetch(`/api/contratos/${id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setAcceptingId(null)
    if (res.ok || res.status === 409) await loadContracts()
  }

  async function handleBuyPoints(contract: ApiContract) {
    setBuyingId(contract.id)
    const res = await fetch(`/api/contratos/${contract.id}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "points" }),
    })
    setBuyingId(null)
    const body = await res.json().catch(() => ({}))
    if (res.ok) { setBuyModal(null); await loadContracts() }
    else alert(body.error ?? "Erro ao comprar com pontos.")
  }

  async function handleBuyCash(contract: ApiContract) {
    setBuyingId(contract.id)
    const res = await fetch(`/api/contratos/${contract.id}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "cash" }),
    })
    const body = await res.json().catch(() => ({}))
    setBuyingId(null)
    if (res.ok && body.orderId) { window.location.href = `/pagar/${body.orderId}`; return }
    alert(body.error ?? "Erro ao iniciar pagamento.")
  }

  function openBuyModal(contract: ApiContract) {
    setBuyModal({ contract, step: "choose" })
    fetch("/api/profile/points").then(r => r.json()).then(d => setUserPoints(d.points ?? null)).catch(() => {})
  }

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
      setTimeout(() => { setSchedModal(null); loadContracts() }, 1800)
    } else {
      const b = await res.json().catch(() => ({}))
      setSchedMsg(b.error ?? "Erro ao agendar.")
    }
  }

  /* ── Dados computados ── */
  const saleContracts   = apiContracts.filter(c => c.user_status !== "active" && c.user_status !== "completed" && c.user_status !== "expired")
  const activeContracts = apiContracts.filter(c => c.user_status === "active")

  /* ── Render ── */
  return (
    <div className={`contratos-page${panelOpen ? "" : " contratos-page--panel-closed"}`}>
      <div className={`contratos-layout${panelOpen ? "" : " contratos-layout--no-panel"}`}>
        <div className="contratos-main">
          {/* Topbar */}
          <div className="contratos-topbar">
            <div>
              <div className="contratos-title-row">
                <h1 className="page-title">Contratos</h1>
                <HelpCircle size={18} className="contratos-help" />
              </div>
              <p className="contratos-subtitle">Complete contratos para ganhar Sucatas, Reputação e itens exclusivos.</p>
            </div>
            <div className="contratos-wallet">
              <span className="contratos-wallet-icon"><Wallet size={18} /></span>
              <div className="contratos-wallet-info">
                <span>Carteira</span>
                <strong>{userSucatas !== null ? userSucatas.toLocaleString("pt-BR") : "—"}</strong>
              </div>
            </div>
          </div>

          {/* Abas */}
          <div className="store-tabs contratos-tabs">
            {tabs.map((tab, i) => (
              <button key={tab} ref={el => { tabRefs.current[i] = el }} type="button"
                className={`store-tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
            <span className="store-tab-indicator" style={{ left: indicator.left, width: indicator.width }} />
          </div>

          {/* ── Aba: Contratos Ativos ── */}
          {activeTab === "Contratos Ativos" && (
            <>
              {loadingContracts ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando...</p>
              ) : activeContracts.length === 0 ? (
                <div className="contratos-placeholder">
                  <h2>Nenhum contrato ativo</h2>
                  <p>Vá para <Link href="/loja?tab=passes" style={{ color: "var(--cyan)" }}>Contratos à Venda</Link> para aceitar um contrato.</p>
                </div>
              ) : (
                <div className="cv-cards-scroll" style={{ paddingBottom: 8 }}>
                  {activeContracts.map(raw => {
                    const mColor  = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
                    const mLabel  = MISSION_LABELS[raw.mission_type] ?? raw.mission_type
                    const tierCol = TIER_COLORS[raw.tier] ?? "var(--gray-500)"
                    const doneCnt = ((raw.objectives ?? []) as any[]).filter((_: any, i: number) => (raw.objectives_progress?.[String(i)] ?? 0) >= ((_ as any).total ?? 1)).length
                    const total   = (raw.objectives ?? []).length || raw.total
                    const pct     = total > 0 ? Math.round((doneCnt / total) * 100) : 0

                    return (
                      <div key={raw.id} className={`cv-card${raw.variant ? ` cv-card--${raw.variant}` : ""}`}>
                        {raw.variant && <div className="cv-card-frame" />}
                        <div className="cv-card-bg">
                          <div className="cv-card-bg-img" style={{ backgroundImage: `url(${raw.image_url ?? "/assets/bots/arc_sentinel.png"})` }} />
                        </div>
                        <div className="cv-card-badges">
                          <span className="cv-card-type" style={{ color: mColor }}>{mLabel}</span>
                          <span className="cv-card-tier" style={{ color: tierCol, borderColor: `color-mix(in srgb, ${tierCol} 40%, transparent)` }}>{raw.tier}</span>
                          {raw.contract_type === "faccao" && (
                            <span style={{ fontSize: 9, fontWeight: 950, color: "#b477ff", textTransform: "uppercase" }}>Facção</span>
                          )}
                        </div>
                        <div className="cv-card-body">
                          <strong className="cv-card-name">{raw.title}</strong>
                          <p className="cv-card-desc">{raw.description}</p>
                          <div className="cv-card-section-label">Recompensas</div>
                          <RewardBadge sucatas={raw.sucatas} xp={raw.xp} rep={raw.rep} />
                          <div className="cv-card-section-label">Progresso</div>
                          <div className="ca-progress-wrap">
                            <div className="ca-progress-bar"><span style={{ width: `${pct}%`, background: mColor }} /></div>
                            <span className="ca-progress-label">{doneCnt}/{total}</span>
                          </div>
                          <div className="cv-card-footer-meta">
                            <span className="cv-card-players"><Clock size={11} />{expiresInStr(raw.expires_at)}</span>
                          </div>
                          <div className="cv-card-actions">
                            <button type="button" className="btn-aceitar"
                              style={raw.faction_color ? { background: raw.faction_color, boxShadow: `0 0 18px ${raw.faction_color}70, 0 2px 8px rgba(0,0,0,0.4)`, color: "rgba(255,255,255,0.95)" } : undefined}
                              onClick={() => setDetailModal(raw)}>
                              <Zap size={14} fill="currentColor" /> Acompanhar Contrato
                            </button>
                          </div>
                        </div>
                        {raw.variant && (
                          <div className="cv-card-variant-footer">
                            ‹ {raw.variant === "dourada" ? "Versão Dourada" : raw.variant === "holografica" ? "Versão Holográfica" : "Versão Corrompida"} ›
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── Aba: Histórico ── */}
          {activeTab === "Histórico" && (
            <div className="historico-section">
              <div className="historico-header">
                <div>
                  <h2 className="page-title">Histórico de Contratos</h2>
                  <p className="contratos-subtitle">Contratos concluídos, falhos ou expirados.</p>
                </div>
              </div>
              {loadingHistory ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando...</p>
              ) : history.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Nenhum contrato no histórico.</p>
              ) : (
                <div className="hist-cards-grid">
                  {history.map(entry => {
                    const c          = entry.contracts
                    const stampColor = entry.status === "completed" ? "#3df28b" : entry.status === "failed" ? "#F5090D" : "#8b99aa"
                    const resultText = entry.status === "completed" ? "CONCLUÍDO" : entry.status === "failed" ? "FALHOU" : "EXPIRADO"
                    const mLabel     = MISSION_LABELS[c?.mission_type ?? ""] ?? (c?.mission_type ?? "—")
                    const mColor     = MISSION_COLORS[c?.mission_type ?? ""] ?? "var(--gray-500)"
                    const objectives = (c?.objectives ?? []) as any[]
                    const total      = objectives.length > 0 ? objectives.length : (c?.total ?? 1)
                    const done       = objectives.length > 0
                      ? objectives.filter((o: any, i: number) => (entry.objectives_progress?.[String(i)] ?? 0) >= o.total).length
                      : entry.progress
                    const pct        = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

                    return (
                      <div key={entry.id} className="hist-card">
                        <div className="hist-card-bg">
                          <div className="hist-card-bg-img" style={{ backgroundImage: `url(${c?.image_url ?? "/assets/bots/arc_sentinel.png"})` }} />
                          <div className="hist-stamp" style={{ color: stampColor, borderColor: stampColor }}>
                            <span className="hist-stamp-text">{resultText}</span>
                          </div>
                        </div>
                        <div className="cv-card-badges">
                          <span className="cv-card-type" style={{ color: mColor }}>{mLabel}</span>
                          <span className="hist-card-date">{new Date(entry.accepted_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="cv-card-body">
                          <strong className="cv-card-name">{c?.title ?? "—"}</strong>
                          <div className="cv-card-section-label">Progresso</div>
                          <div className="ca-progress-wrap">
                            <div className="ca-progress-bar">
                              <span style={{ width: `${pct}%`, background: stampColor }} />
                            </div>
                            <span className="ca-progress-label">{done}/{total}</span>
                          </div>
                          {entry.status === "completed" && (c?.sucatas ?? 0) > 0 && (
                            <>
                              <div className="cv-card-section-label">Recompensas</div>
                              <RewardBadge sucatas={c?.sucatas ?? 0} xp={c?.xp ?? 0} rep={c?.rep ?? null} />
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rodapé fixo */}
          <div className="contratos-tip">
            <div className="contratos-tip-image" style={{ backgroundImage: "url(/assets/bots/arc_wasp.png)" }} />
            <div>
              <h2>Dica do Contrato</h2>
              <p>Contratos do tipo Facção rendem mais reputação para sua facção. Priorize-os se quiser subir de nível mais rápido entre os Raiders.</p>
            </div>
          </div>
        </div>

        {/* ── Painel lateral ── */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`}>
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          <div className="contratos-reputation">
            <div className="contratos-reputation-row">
              <div className="contratos-reputation-value">
                <span>Sucatas</span>
                <strong style={{ color: "var(--yellow)" }}>{userSucatas !== null ? userSucatas.toLocaleString("pt-BR") : "—"} pts</strong>
              </div>
              <div className="contratos-reputation-badge">
                <span>Contratos</span>
                <span className="contratos-reputation-tier"><Shield size={14} fill="currentColor" />{contractStats?.completed ?? 0} concluídos</span>
              </div>
            </div>
            <div className="store-reputation-bar">
              <span style={{ width: `${contractStats && contractStats.total > 0 ? Math.round((contractStats.completed / contractStats.total) * 100) : 0}%` }} />
            </div>
          </div>

          {activeTab === "Histórico" && (
            <>
              <div className="store-side-card contratos-side-fill">
                <h2>Resumo do Histórico</h2>
                <div className="historico-summary-grid">
                  <div className="historico-summary-stat historico-stat-green">
                    <span className="historico-stat-icon"><Trophy size={18} /></span>
                    <div><span>Concluídos</span><strong>{contractStats?.completed ?? "—"}</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-red">
                    <span className="historico-stat-icon"><XCircle size={18} /></span>
                    <div><span>Falhos</span><strong>{contractStats?.failed ?? "—"}</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-blue">
                    <span className="historico-stat-icon"><BarChart2 size={18} /></span>
                    <div><span>Taxa de Sucesso</span><strong>{contractStats ? `${contractStats.success_rate}%` : "—"}</strong></div>
                  </div>
                  <div className="historico-summary-stat historico-stat-yellow">
                    <span className="historico-stat-icon"><Coins size={18} /></span>
                    <div><span>Sucatas</span><strong>{userSucatas !== null ? userSucatas.toLocaleString("pt-BR") : "—"}</strong></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab !== "Histórico" && (
            <>
              <div className="store-side-card contratos-side-fill">
                <h2>Progresso de Reputação</h2>
                <div className="contratos-rep-level">
                  <div className="contratos-rep-icon"><Shield size={22} fill="currentColor" /></div>
                  <div className="contratos-rep-info">
                    <span>Nível Atual: <strong>Mercador Lendário</strong></span>
                    <div className="contratos-bar-row">
                      <div className="store-reputation-bar"><span style={{ width: "82.5%" }} /></div>
                      <span>8.250 / 10.000 REP</span>
                    </div>
                  </div>
                </div>
              </div>

              {pointRewards.length > 0 && (
                <div className="store-side-card contratos-side-fill">
                  <div className="contratos-side-head"><h2>Próximas Recompensas</h2></div>
                  <div className="contratos-next-rewards">
                    {pointRewards.filter(r => !r.unlocked).slice(0, 5).map((reward: any) => (
                      <div key={reward.id} className="contratos-next-reward">
                        <div className="contratos-next-reward-thumb"
                          style={{ backgroundImage: reward.item?.icon_url ? `url(${reward.item.icon_url})` : undefined,
                                   background: reward.item?.icon_url ? undefined : "rgba(255,255,255,0.05)" }} />
                        <div className="contratos-next-reward-info">
                          <strong>{reward.item?.name ?? "—"}</strong>
                          <span>Ao atingir {reward.points_threshold.toLocaleString("pt-BR")} pts</span>
                          <div className="contratos-bar-row">
                            <div className="store-reputation-bar">
                              <span style={{ width: `${reward.progress_pct}%` }} />
                            </div>
                            <span>{(userSucatas ?? 0).toLocaleString("pt-BR")} / {reward.points_threshold.toLocaleString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pointRewards.filter(r => !r.unlocked).length === 0 && (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--green)", fontWeight: 800 }}>🏆 Todas as recompensas desbloqueadas!</p>
                    )}
                  </div>
                </div>
              )}

              {activeContracts.length > 0 && activeTab !== "Contratos Ativos" && (
                <div className="store-side-card contratos-side-fill">
                  <div className="contratos-side-head">
                    <h2>Meus Contratos</h2>
                    <button type="button" className="contratos-see-all" onClick={() => setActiveTab("Contratos Ativos")}>
                      Ver Todos <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="contratos-daily-list">
                    {activeContracts.slice(0, 3).map(raw => {
                      const mColor = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
                      const objectives = (raw.objectives ?? []) as any[]
                      const done = objectives.length > 0
                        ? objectives.filter((o: any, i: number) => (raw.objectives_progress?.[String(i)] ?? 0) >= o.total).length
                        : (raw.user_progress ?? 0)
                      const total = objectives.length > 0 ? objectives.length : raw.total
                      const allDone = done >= total && total > 0
                      return (
                        <div key={raw.id} className={`contratos-daily-item${allDone ? " done" : ""}`}>
                          <div className="contratos-daily-info">
                            <strong style={{ color: mColor }}>{MISSION_LABELS[raw.mission_type]}</strong>
                            <span style={{ fontSize: 11, color: "var(--paper)", fontWeight: 800 }}>{raw.title}</span>
                            {allDone ? (
                              <div className="contratos-daily-progress-row">
                                <span className="contratos-daily-count done">{done}/{total}</span>
                                <span className="contratos-daily-done"><Check size={12} />Concluído</span>
                              </div>
                            ) : (
                              <span className="contratos-daily-count">{done}/{total} objetivos</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>

      {/* ── Modal de compra ── */}
      {buyModal && (
        <div className="cdm-overlay" onClick={() => setBuyModal(null)}>
          <div className="cdm-modal" style={{ maxWidth: 440, gridTemplateColumns: "1fr" }} onClick={e => e.stopPropagation()}>
            <button className="cdm-close" type="button" onClick={() => setBuyModal(null)}>✕</button>
            <div className="cdm-left" style={{ padding: 24 }}>
              {buyModal.contract.image_url && (
                <div className="cdm-hero" style={{ backgroundImage: `url(${buyModal.contract.image_url})`, borderRadius: 8, marginBottom: 16 }}>
                  <div className="cdm-hero-overlay" />
                  <div className="cdm-hero-content">
                    <span className="cdm-op-badge">{MISSION_LABELS[buyModal.contract.mission_type]}</span>
                    <h2 className="cdm-title">{buyModal.contract.title}</h2>
                  </div>
                </div>
              )}
              {!buyModal.contract.image_url && <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 950 }}>{buyModal.contract.title}</h2>}

              {buyModal.step === "choose" && (
                <div style={{ display: "grid", gap: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Como deseja pagar?</p>
                  {buyModal.contract.price_points > 0 && (
                    <button type="button"
                      onClick={() => { setBuyModal(m => m ? { ...m, step: "points" } : null) }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,212,0,0.35)", background: "rgba(255,212,0,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                      <span>🪙 Comprar com Sucatas</span>
                      <span style={{ color: "#ffd400" }}>{buyModal.contract.price_points.toLocaleString("pt-BR")} pts</span>
                    </button>
                  )}
                  {buyModal.contract.price_real > 0 && (
                    <button type="button"
                      onClick={() => setBuyModal(m => m ? { ...m, step: "cash" } : null)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(61,242,139,0.35)", background: "rgba(61,242,139,0.07)", color: "var(--paper)", padding: "14px 16px", fontSize: 13, fontWeight: 950, cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                      <span>🏦 Pagar com PIX</span>
                      <span style={{ color: "#3df28b" }}>R$ {Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}</span>
                    </button>
                  )}
                </div>
              )}

              {buyModal.step === "points" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Resumo</p>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--paper-dim)" }}>Contrato</span><strong>{buyModal.contract.title}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Valor</span>
                        <strong style={{ color: "#ffd400" }}>{buyModal.contract.price_points.toLocaleString("pt-BR")} pts</strong>
                      </div>
                      {userPoints !== null && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "var(--gray-500)" }}>Saldo atual</span>
                            <span style={{ color: userPoints >= buyModal.contract.price_points ? "var(--paper)" : "var(--red)", fontWeight: 800 }}>{userPoints.toLocaleString("pt-BR")} pts</span>
                          </div>
                          {userPoints < buyModal.contract.price_points && (
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--red)", fontWeight: 800 }}>⚠ Pontos insuficientes</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button type="button" className="btn-aceitar"
                    disabled={buyingId === buyModal.contract.id || (userPoints !== null && userPoints < buyModal.contract.price_points)}
                    onClick={() => handleBuyPoints(buyModal.contract)}>
                    <Zap size={14} fill="currentColor" />
                    {buyingId === buyModal.contract.id ? "Confirmando..." : `Confirmar — ${buyModal.contract.price_points.toLocaleString("pt-BR")} pts`}
                  </button>
                  <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "choose" } : null)}
                    style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", color: "var(--paper-dim)", padding: "10px 0", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                    ← Voltar
                  </button>
                </div>
              )}

              {buyModal.step === "cash" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Resumo</p>
                    <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--paper-dim)" }}>Contrato</span><strong>{buyModal.contract.title}</strong></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <span style={{ color: "var(--paper-dim)" }}>Valor</span>
                        <strong style={{ color: "#3df28b" }}>R$ {Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}</strong>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-aceitar" disabled={buyingId === buyModal.contract.id} onClick={() => handleBuyCash(buyModal.contract)}>
                    <Zap size={14} fill="currentColor" />
                    {buyingId === buyModal.contract.id ? "Gerando PIX..." : `Pagar R$ ${Number(buyModal.contract.price_real).toFixed(2).replace(".", ",")}`}
                  </button>
                  <button type="button" onClick={() => setBuyModal(m => m ? { ...m, step: "choose" } : null)}
                    style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.03)", color: "var(--paper-dim)", padding: "10px 0", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                    ← Voltar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de detalhe do contrato ativo ── */}
      {detailModal && (
        <div className="cdm-overlay" onClick={() => setDetailModal(null)}
          style={{ zIndex: 200, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(7,9,15,0.75)", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 920, maxHeight: "90vh", overflowY: "auto", borderRadius: 14, position: "relative" }}>
            <button type="button" onClick={() => setDetailModal(null)}
              style={{ position: "sticky", top: 0, float: "right", zIndex: 10, margin: "0 0 -36px auto", display: "flex", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(12,16,24,0.9)", color: "var(--paper-dim)", cursor: "pointer", fontSize: 15, alignItems: "center", justifyContent: "center", font: "inherit" }}>
              ✕
            </button>
            <ActiveContractCard raw={detailModal} accentColor={detailModal.faction_color ?? undefined} onAgendar={(id, idx, title, obj) => { setDetailModal(null); openScheduleModal(id, idx, title, obj) }} />
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

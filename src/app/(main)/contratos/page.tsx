"use client"

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  BarChart2, Check, ChevronLeft, ChevronRight, Clock, Coins, Crosshair,
  HelpCircle, ScrollText, Shield, Star, Target, Trophy, Users, Wallet, XCircle, Zap,
} from "lucide-react"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/contratos.css"
import "../../../styles/contratos-venda.css"
import type { Contract as ApiContract } from "@/app/api/contratos/route"
import type { HistoryItem } from "@/app/api/contratos/history/route"

/* ── Constantes ── */
const MISSION_COLORS: Record<string, string> = { diario: "#3df28b", semanal: "#ffd400", mensal: "#b477ff" }
const MISSION_LABELS: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" }
const TIER_COLORS: Record<string, string>   = { Básico: "#5fa8ff", Avançado: "#ffd400", Épico: "#b477ff", Lendário: "#ff8c42" }
const RISK_COLORS: Record<string, string>   = { Baixo: "#3df28b", Médio: "#ffd400", Alto: "#ff8c42", Extremo: "#F5090D" }

const tabs = ["Contratos à Venda", "Contratos Ativos", "Histórico"] as const
type Tab   = typeof tabs[number]

/* ── Tipos locais ── */
type BuyModal = { contract: ApiContract; step: "choose" | "points" | "cash" }
type SchedModal = { contractId: string; objectiveIndex: number; title: string; objective: string }

/* ── Helpers ── */
function expiresInStr(iso: string | null): string {
  if (!iso) return "—"
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "Expirado"
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  return d > 0 ? `${d}d ${h}h` : `${h}h`
}

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
  const [panelOpen, setPanelOpen]     = useState(true)
  const [activeTab, setActiveTab]     = useState<Tab>("Contratos à Venda")
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

  /* ── Contrato Ativo: card detalhado ── */
  function ActiveContractCard({ raw, onAgendar }: { raw: ApiContract; onAgendar?: (id: string, idx: number, title: string, obj: string) => void }) {
    const mColor     = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
    const tierCol    = TIER_COLORS[raw.tier]             ?? "var(--gray-500)"
    const riskCol    = RISK_COLORS[raw.environmental_risk] ?? "var(--gray-500)"
    const objectives = (raw.objectives ?? []) as Array<{ text?: string; desc?: string; total: number; item_icon?: string; item_name?: string }>
    const enemies    = (raw.enemies    ?? []) as Array<{ name: string; type: string; dots: number; color: string; image: string }>
    const objProg    = raw.objectives_progress ?? {}
    const sched      = raw.active_schedule
    const expiresIn  = expiresInStr(raw.expires_at)

    const doneCnt  = objectives.filter((o, i) => (objProg[String(i)] ?? 0) >= o.total).length
    const activeIdx = objectives.findIndex((o, i) => (objProg[String(i)] ?? 0) < o.total)
    const bonusCondition = (raw as any).bonus_condition as string | undefined
    const bonusReward    = (raw as any).bonus_reward    as string | undefined

    let badgeLabel = "MISSÃO"
    let badgeColor = "#8b99aa"
    if (raw.contract_type === "faccao")    { badgeLabel = "FACÇÃO";  badgeColor = "#b477ff" }
    else if (raw.tier === "Épico")         { badgeLabel = "ESPECIAL"; badgeColor = "#ff8c42" }
    else if (raw.tier === "Lendário")      { badgeLabel = "ESPECIAL"; badgeColor = "#F5090D" }

    const metaItems = [
      { label: "DIFICULDADE", value: raw.environmental_risk || "—", color: riskCol },
      { label: "TIER",        value: raw.tier || "—",               color: tierCol },
      { label: "JOGADORES",   value: raw.players_completed.toLocaleString("pt-BR") },
      { label: "EXPIRA EM",   value: expiresIn },
    ]
    const opDetails = [
      raw.estimated_time  && { icon: "⏱",  label: "Tempo Estimado", value: raw.estimated_time },
      raw.best_time_of_day && { icon: "🌤", label: "Melhor Horário", value: raw.best_time_of_day },
      raw.climate          && { icon: "🌥", label: "Clima",          value: raw.climate },
      raw.environmental_risk && { icon: "⚠️", label: "Risco Ambiental", value: raw.environmental_risk, color: riskCol },
    ].filter(Boolean) as { icon: string; label: string; value: string; color?: string }[]

    return (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,320px) 1fr", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0c1018" }}>

        {/* ── PAINEL ESQUERDO ── */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Imagem */}
          <div style={{ position: "relative", height: 210, flexShrink: 0, overflow: "hidden" }}>
            {raw.image_url
              ? <img src={raw.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.03)" }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(12,16,24,0.2) 0%, rgba(12,16,24,0.9) 100%)" }} />
            <div style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
              <span style={{ display: "inline-block", fontSize: 9, fontWeight: 950, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 3, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55`, marginBottom: 6, textTransform: "uppercase" as const }}>
                {badgeLabel}
              </span>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "var(--paper)", lineHeight: 1.1, textTransform: "uppercase" as const }}>{raw.title}</h3>
              {raw.location && (
                <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 4 }}>
                  📍 {raw.location}
                </p>
              )}
            </div>
          </div>

          {/* Conteúdo esquerdo */}
          <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            {raw.description && (
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{raw.description}</p>
            )}

            {/* Meta grid 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {metaItems.map(item => (
                <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "8px 10px" }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>{item.label}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 950, color: item.color ?? "var(--paper)" }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Sobre a Operação */}
            {raw.story && (
              <div>
                <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>Sobre a Operação</p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{raw.story}</p>
              </div>
            )}

            {/* Detalhes operacionais */}
            {opDetails.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {opDetails.map(d => (
                  <div key={d.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{d.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.28)", fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{d.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: d.color ?? "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Local da Operação */}
            {raw.location && (
              <div>
                <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>Local da Operação</p>
                <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" }}>
                  {raw.image_url && <div style={{ height: 52, backgroundImage: `url(${raw.image_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.35) saturate(0.4)" }} />}
                  <div style={{ padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 950, color: "var(--paper)" }}>{raw.location}</p>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Setor Leste</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PAINEL DIREITO ── */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 680 }}>

          {/* Objetivos */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Objetivos</p>
            <div style={{ display: "grid", gap: 5 }}>
              {objectives.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum objetivo cadastrado.</p>
              )}
              {objectives.map((obj, i) => {
                const prog     = objProg[String(i)] ?? 0
                const done     = prog >= obj.total
                const isActive = i === activeIdx
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${done ? "rgba(61,242,139,0.25)" : isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`, borderRadius: 8, background: done ? "rgba(61,242,139,0.05)" : isActive ? "rgba(255,255,255,0.03)" : "transparent" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? "var(--green)" : isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`, background: done ? "rgba(61,242,139,0.15)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {done
                        ? <Check size={12} style={{ color: "var(--green)" }} />
                        : <span style={{ fontSize: 10, fontWeight: 950, color: isActive ? "var(--paper)" : "rgba(255,255,255,0.25)" }}>{i + 1}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 950, color: done ? "var(--green)" : isActive ? "var(--paper)" : "rgba(255,255,255,0.3)" }}>{obj.text || `Objetivo ${i + 1}`}</p>
                      {obj.desc && <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{obj.desc}</p>}
                    </div>
                    {!done && obj.total > 1 && (
                      <span style={{ fontSize: 11, fontWeight: 950, color: isActive ? mColor : "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                        {prog} / {obj.total}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recompensas */}
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Recompensas Estimadas</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {raw.sucatas > 0 && (
                <div style={{ flex: 1, minWidth: 70, background: "rgba(255,212,0,0.07)", border: "1px solid rgba(255,212,0,0.18)", borderRadius: 8, padding: "10px 12px", textAlign: "center" as const }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#ffd400" }}>{raw.sucatas.toLocaleString("pt-BR")}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(255,212,0,0.55)", textTransform: "uppercase" as const, fontWeight: 950 }}>Sucatas</p>
                </div>
              )}
              {raw.xp > 0 && (
                <div style={{ flex: 1, minWidth: 70, background: "rgba(95,168,255,0.07)", border: "1px solid rgba(95,168,255,0.18)", borderRadius: 8, padding: "10px 12px", textAlign: "center" as const }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#5fa8ff" }}>{raw.xp.toLocaleString("pt-BR")}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(95,168,255,0.55)", textTransform: "uppercase" as const, fontWeight: 950 }}>XP</p>
                </div>
              )}
              {(raw.rep ?? 0) > 0 && (
                <div style={{ flex: 1, minWidth: 70, background: "rgba(180,119,255,0.07)", border: "1px solid rgba(180,119,255,0.18)", borderRadius: 8, padding: "10px 12px", textAlign: "center" as const }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 950, color: "#b477ff" }}>{raw.rep}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(180,119,255,0.55)", textTransform: "uppercase" as const, fontWeight: 950 }}>REP</p>
                </div>
              )}
              {bonusCondition && (
                <div style={{ flex: 2, minWidth: 140, background: "rgba(61,242,139,0.05)", border: "1px solid rgba(61,242,139,0.18)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, color: "rgba(61,242,139,0.55)" }}>Bônus de Sucesso</p>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{bonusCondition}</p>
                  {bonusReward && <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 950, color: "var(--green)" }}>+{bonusReward}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Inimigos */}
          {enemies.length > 0 && (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Inimigos Principais</p>
              <div style={{ display: "flex", gap: 8, overflowX: "auto" as const, paddingBottom: 4 }}>
                {enemies.map((enemy, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 82, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
                    {enemy.image
                      ? <img src={enemy.image} alt={enemy.name} style={{ width: "100%", height: 60, objectFit: "cover" }} />
                      : <div style={{ height: 60, background: "rgba(255,255,255,0.04)", display: "grid", placeItems: "center" }}><Crosshair size={18} style={{ color: "rgba(255,255,255,0.15)" }} /></div>}
                    <div style={{ padding: "6px 8px" }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 950, color: "var(--paper)", lineHeight: 1.2 }}>{enemy.name}</p>
                      <p style={{ margin: "1px 0 4px", fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const }}>{enemy.type}</p>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, di) => (
                          <div key={di} style={{ width: 6, height: 6, borderRadius: "50%", background: di < (enemy.dots ?? 0) ? (enemy.color || "#3df28b") : "rgba(255,255,255,0.08)" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats globais */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 950, color: "var(--paper)" }}>{raw.players_completed.toLocaleString("pt-BR")}</p>
              <p style={{ margin: "2px 0 0", fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, fontWeight: 950, lineHeight: 1.3 }}>Jogadores que completaram</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 950, color: raw.success_rate < 50 ? "var(--red)" : raw.success_rate < 75 ? "#ffd400" : "var(--green)" }}>{raw.success_rate}%</p>
              <p style={{ margin: "2px 0 0", fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, fontWeight: 950 }}>Taxa de Sucesso</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 950, color: "var(--paper)" }}>{raw.best_record_time || "—"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 8, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, fontWeight: 950 }}>Melhor Tempo</p>
              {raw.best_record_player && <p style={{ margin: "1px 0 0", fontSize: 8, color: "rgba(255,255,255,0.25)" }}>POR {raw.best_record_player.toUpperCase()}</p>}
            </div>
          </div>

          {/* Progresso + Ação */}
          <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, fontWeight: 950 }}>Progresso Atual</p>
                <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 950, color: mColor }}>{doneCnt} / {objectives.length}</p>
              </div>
              {activeIdx >= 0 && (
                sched?.status === "scheduled" ? (
                  <div style={{ flex: 1, background: "rgba(61,242,139,0.05)", border: "1px solid rgba(61,242,139,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 950, color: "var(--green)" }}>✓ Entrega agendada</p>
                    {sched.scheduled_at && (
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                        {new Date(sched.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {sched.game_id && <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--cyan)", fontFamily: "monospace" }}>{sched.game_id}</p>}
                  </div>
                ) : (
                  <button type="button" className="btn-aceitar"
                    onClick={() => {
                      const obj = objectives[activeIdx]
                      const label = obj?.text ?? `Objetivo ${activeIdx + 1}`
                      if (onAgendar) onAgendar(raw.id, activeIdx, raw.title, label)
                      else openScheduleModal(raw.id, activeIdx, raw.title, label)
                    }}>
                    <Zap size={14} fill="currentColor" /> Agendar Entrega
                  </button>
                )
              )}
              {activeIdx === -1 && objectives.length > 0 && (
                <span style={{ fontSize: 13, fontWeight: 950, color: "var(--green)" }}>🏆 Todos os objetivos concluídos!</span>
              )}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" as const }}>
              Contrato ativo — progresso salvo automaticamente.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Dados computados ── */
  const saleContracts   = apiContracts.filter(c => c.user_status !== "active" && c.user_status !== "completed")
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

          {/* ── Aba: Contratos à Venda ── */}
          {activeTab === "Contratos à Venda" && (
            <>
              <div className="contratos-hero-row">
                <div className="hero-banner" style={{ backgroundImage: "url(/assets/bots/arc_rocketeer.png)" }}>
                  <div className="hero-banner-content">
                    <span className="hero-banner-tag"><ScrollText size={12} />Contratos ARC</span>
                    <h2>Sua Missão. Sua Recompensa.</h2>
                    <p>Aceite contratos de Raiders, facções e do próprio Sucatão. Complete objetivos e receba recompensas exclusivas em Sucatas, Reputação e itens.</p>
                  </div>
                </div>
                <div className="contratos-summary">
                  <h2>Resumo Geral</h2>
                  <div className="contratos-summary-grid">
                    <div className="contratos-summary-stat"><span>Contratos Ativos</span><strong>{activeContracts.length}</strong></div>
                    <div className="contratos-summary-stat"><span>Concluídos</span><strong>{contractStats?.completed ?? "—"}</strong></div>
                    <div className="contratos-summary-stat"><span>Taxa de Sucesso</span><strong>{contractStats ? `${contractStats.success_rate}%` : "—"}</strong></div>
                    <div className="contratos-summary-stat"><span>Sucatas</span><strong>{userSucatas?.toLocaleString("pt-BR") ?? "—"}</strong></div>
                  </div>
                </div>
              </div>

              {loadingContracts ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando contratos...</p>
              ) : saleContracts.length === 0 ? (
                <div className="contratos-placeholder"><h2>Nenhum contrato disponível</h2><p>Novos contratos serão lançados em breve.</p></div>
              ) : (
                <div className="cv-cards-scroll" style={{ paddingBottom: 8 }}>
                  {saleContracts.map(raw => {
                    const mColor  = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
                    const mLabel  = MISSION_LABELS[raw.mission_type] ?? raw.mission_type
                    const tierCol = TIER_COLORS[raw.tier] ?? "var(--gray-500)"
                    const pct     = raw.total > 0 ? Math.round(((raw.user_progress ?? 0) / raw.total) * 100) : 0
                    const isFree  = !raw.price_points && !raw.price_real
                    const isPending = raw.user_status === null

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
                          <div className="cv-card-section-label">Objetivo</div>
                          <div className="cv-card-objective"><Target size={11} />{raw.objective}</div>
                          <div className="cv-card-section-label">Recompensas</div>
                          <RewardBadge sucatas={raw.sucatas} xp={raw.xp} rep={raw.rep} />
                          <div className="cv-card-section-label">Progresso</div>
                          <div className="ca-progress-wrap">
                            <div className="ca-progress-bar"><span style={{ width: `${pct}%` }} /></div>
                            <span className="ca-progress-label">{raw.user_progress ?? 0}/{raw.total}</span>
                          </div>
                          <div className="cv-card-footer-meta">
                            <span className="cv-card-players"><Clock size={11} />{expiresInStr(raw.expires_at)}</span>
                            {!isFree && (
                              <span style={{ fontSize: 10, color: "#ffd400" }}>
                                {raw.price_points > 0 ? `${raw.price_points.toLocaleString("pt-BR")} pts` : `R$ ${Number(raw.price_real).toFixed(2).replace(".", ",")}`}
                              </span>
                            )}
                          </div>
                          <div className="cv-card-actions">
                            {raw.user_status === "completed" ? (
                              <span style={{ fontSize: 10, fontWeight: 950, color: "var(--green)", textTransform: "uppercase" }}>Concluído</span>
                            ) : isPending ? (
                              isFree ? (
                                <button type="button" className="btn-aceitar" disabled={acceptingId === raw.id}
                                  onClick={() => handleAcceptFree(raw.id)}>
                                  <Zap size={14} fill="currentColor" />
                                  {acceptingId === raw.id ? "Aceitando..." : "Aceitar"}
                                </button>
                              ) : (
                                <button type="button" className="btn-aceitar" onClick={() => openBuyModal(raw)}>
                                  <Zap size={14} fill="currentColor" />
                                  {raw.price_points > 0 ? `${raw.price_points.toLocaleString("pt-BR")} pts` : `R$ ${Number(raw.price_real).toFixed(2).replace(".", ",")}`}
                                </button>
                              )
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 950, color: "var(--yellow)", textTransform: "uppercase" }}>Em progresso</span>
                            )}
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

          {/* ── Aba: Contratos Ativos ── */}
          {activeTab === "Contratos Ativos" && (
            <>
              {loadingContracts ? (
                <p style={{ color: "var(--gray-500)", fontSize: 13, padding: 24 }}>Carregando...</p>
              ) : activeContracts.length === 0 ? (
                <div className="contratos-placeholder">
                  <h2>Nenhum contrato ativo</h2>
                  <p>Vá para <button type="button" onClick={() => setActiveTab("Contratos à Venda")} style={{ background: "none", border: "none", color: "var(--cyan)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}>Contratos à Venda</button> para aceitar um contrato.</p>
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
                            <button type="button" className="btn-aceitar" onClick={() => setDetailModal(raw)}>
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
            <ActiveContractCard raw={detailModal} onAgendar={(id, idx, title, obj) => { setDetailModal(null); openScheduleModal(id, idx, title, obj) }} />
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

"use client"

import { useState, useRef, useEffect } from "react"
import { Check, Crosshair, Zap } from "lucide-react"
import type { Contract as ApiContract } from "@/app/api/contratos/route"

export const MISSION_COLORS: Record<string, string> = { diario: "#3df28b", semanal: "#ffd400", mensal: "#b477ff" }
export const TIER_COLORS:    Record<string, string> = { Básico: "#5fa8ff", Avançado: "#ffd400", Épico: "#b477ff", Lendário: "#ff8c42" }
export const RISK_COLORS:    Record<string, string> = { Baixo: "#3df28b", Médio: "#ffd400", Alto: "#ff8c42", Extremo: "#F5090D" }

export const OBJ_PAGE_SIZE = 3

export type ObjType   = { text?: string; desc?: string; total: number; item_icon?: string; item_name?: string }
export type EnemyType = { name: string; type: string; dots: number; color: string; image: string }

export function expiresInStr(iso: string | null): string {
  if (!iso) return "—"
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "Expirado"
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  return d > 0 ? `${d}d ${h}h` : `${h}h`
}

function accentBtnStyle(color: string) {
  return {
    background: color,
    boxShadow: `0 0 18px ${color}70, 0 2px 8px rgba(0,0,0,0.4)`,
    color: "rgba(255,255,255,0.95)" as const,
  }
}

export function ActiveContractCard({ raw, onAgendar, accentColor }: {
  raw: ApiContract
  onAgendar: (id: string, idx: number, title: string, obj: string) => void
  accentColor?: string
}) {
  const mColor     = MISSION_COLORS[raw.mission_type] ?? "#5fa8ff"
  const tierCol    = TIER_COLORS[raw.tier]              ?? "var(--gray-500)"
  const riskCol    = RISK_COLORS[raw.environmental_risk] ?? "var(--gray-500)"
  const objectives = (raw.objectives ?? []) as ObjType[]
  const enemies    = (raw.enemies    ?? []) as EnemyType[]
  const objProg    = raw.objectives_progress ?? {}
  const sched      = raw.active_schedule
  const expiresIn  = expiresInStr(raw.expires_at)

  const doneCnt   = objectives.filter((o, i) => (objProg[String(i)] ?? 0) >= o.total).length
  const activeIdx = objectives.findIndex((o, i) => (objProg[String(i)] ?? 0) < o.total)
  const bonusCondition = (raw as any).bonus_condition as string | undefined
  const bonusReward    = (raw as any).bonus_reward    as string | undefined

  let badgeLabel = "MISSÃO",  badgeColor = "#8b99aa"
  if (raw.contract_type === "faccao")  { badgeLabel = "FACÇÃO";   badgeColor = "#b477ff" }
  else if (raw.tier === "Épico")       { badgeLabel = "ESPECIAL"; badgeColor = "#ff8c42" }
  else if (raw.tier === "Lendário")    { badgeLabel = "ESPECIAL"; badgeColor = "#F5090D" }

  const metaItems = [
    { label: "DIFICULDADE", value: raw.environmental_risk || "—", color: riskCol },
    { label: "TIER",        value: raw.tier || "—",               color: tierCol },
    { label: "JOGADORES",   value: raw.players_completed.toLocaleString("pt-BR") },
    { label: "EXPIRA EM",   value: expiresIn },
  ]
  const opDetails = [
    raw.estimated_time   && { icon: "⏱",  label: "Tempo Estimado",  value: raw.estimated_time },
    raw.best_time_of_day && { icon: "🌤", label: "Melhor Horário",  value: raw.best_time_of_day },
    raw.climate          && { icon: "🌥", label: "Clima",           value: raw.climate },
    raw.environmental_risk && { icon: "⚠️", label: "Risco Ambiental", value: raw.environmental_risk, color: riskCol },
  ].filter(Boolean) as { icon: string; label: string; value: string; color?: string }[]

  /* ── Carrossel de objetivos ── */
  const useCarousel = objectives.length > OBJ_PAGE_SIZE
  const totalPages  = useCarousel ? Math.ceil(objectives.length / OBJ_PAGE_SIZE) : 1
  const [objPage, setObjPage] = useState(() =>
    useCarousel && activeIdx >= 0 ? Math.floor(activeIdx / OBJ_PAGE_SIZE) : 0
  )
  const dragStartX = useRef<number | null>(null)
  const wheelRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wheelRef.current
    if (!el || !useCarousel) return
    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.deltaY > 0) setObjPage(p => Math.min(p + 1, totalPages - 1))
      else              setObjPage(p => Math.max(p - 1, 0))
    }
    el.addEventListener("wheel", handleWheel, { passive: false })
    return () => el.removeEventListener("wheel", handleWheel)
  }, [useCarousel, totalPages])

  function onDragStart(x: number) { dragStartX.current = x }
  function onDragEnd(x: number) {
    if (dragStartX.current === null) return
    const delta = x - dragStartX.current
    if (delta < -40 && objPage < totalPages - 1) setObjPage(p => p + 1)
    if (delta >  40 && objPage > 0)              setObjPage(p => p - 1)
    dragStartX.current = null
  }

  function ObjRow({ obj, i }: { obj: ObjType; i: number }) {
    const prog     = objProg[String(i)] ?? 0
    const done     = prog >= obj.total
    const isActive = i === activeIdx
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: `1px solid ${done ? "rgba(61,242,139,0.25)" : isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`, borderRadius: 8, background: done ? "rgba(61,242,139,0.05)" : isActive ? "rgba(255,255,255,0.03)" : "transparent" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${done ? "var(--green)" : isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`, background: done ? "rgba(61,242,139,0.15)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
          {done ? <Check size={12} style={{ color: "var(--green)" }} /> : <span style={{ fontSize: 10, fontWeight: 950, color: isActive ? "var(--paper)" : "rgba(255,255,255,0.25)" }}>{i + 1}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 950, color: done ? "var(--green)" : isActive ? "var(--paper)" : "rgba(255,255,255,0.3)" }}>{obj.text || `Objetivo ${i + 1}`}</p>
          {obj.desc && <p style={{ margin: "1px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{obj.desc}</p>}
        </div>
        {!done && obj.total > 1 && (
          <span style={{ fontSize: 11, fontWeight: 950, color: isActive ? mColor : "rgba(255,255,255,0.25)", flexShrink: 0 }}>{prog} / {obj.total}</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,320px) 1fr", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0c1018" }}>

      {/* ── PAINEL ESQUERDO ── */}
      <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "relative", height: 210, flexShrink: 0, overflow: "hidden" }}>
          {raw.image_url
            ? <img src={raw.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.03)" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(12,16,24,0.2) 0%, rgba(12,16,24,0.9) 100%)" }} />
          <div style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
            <span style={{ display: "inline-block", fontSize: 9, fontWeight: 950, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 3, background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}55`, marginBottom: 6, textTransform: "uppercase" as const }}>{badgeLabel}</span>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "var(--paper)", lineHeight: 1.1, textTransform: "uppercase" as const }}>{raw.title}</h3>
            {raw.location && <p style={{ margin: "5px 0 0", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>📍 {raw.location}</p>}
          </div>
        </div>

        <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {raw.description && <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{raw.description}</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {metaItems.map(item => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "8px 10px" }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>{item.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, fontWeight: 950, color: item.color ?? "var(--paper)" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {raw.story && (
            <div>
              <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "rgba(255,255,255,0.3)" }}>Sobre a Operação</p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{raw.story}</p>
            </div>
          )}

          {opDetails.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {opDetails.map(d => (
                <div key={d.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{d.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 8, color: "rgba(255,255,255,0.28)", fontWeight: 950, textTransform: "uppercase" as const }}>{d.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: d.color ?? "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

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
          {objectives.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum objetivo cadastrado.</p>
          ) : useCarousel ? (
            <div>
              <div ref={wheelRef} style={{ overflow: "hidden", userSelect: "none", cursor: "grab" }}
                onMouseDown={e => onDragStart(e.clientX)}
                onMouseUp={e => onDragEnd(e.clientX)}
                onMouseLeave={() => { dragStartX.current = null }}
                onTouchStart={e => onDragStart(e.touches[0].clientX)}
                onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}>
                <div style={{ display: "flex", transition: "transform 0.3s ease", transform: `translateX(-${objPage * 100}%)` }}>
                  {Array.from({ length: totalPages }).map((_, pi) => (
                    <div key={pi} style={{ minWidth: "100%", display: "grid", gap: 5 }}>
                      {objectives.slice(pi * OBJ_PAGE_SIZE, (pi + 1) * OBJ_PAGE_SIZE).map((obj, _i) => (
                        <ObjRow key={pi * OBJ_PAGE_SIZE + _i} obj={obj} i={pi * OBJ_PAGE_SIZE + _i} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
                {Array.from({ length: totalPages }).map((_, pi) => (
                  <button key={pi} type="button" onClick={() => setObjPage(pi)}
                    style={{ width: pi === objPage ? 16 : 6, height: 6, borderRadius: 3, background: pi === objPage ? mColor : "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s ease", flexShrink: 0 }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 5 }}>
              {objectives.map((obj, i) => <ObjRow key={i} obj={obj} i={i} />)}
            </div>
          )}
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
                  {sched.scheduled_at && <p style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{new Date(sched.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>}
                  {sched.game_id && <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--cyan)", fontFamily: "monospace" }}>{sched.game_id}</p>}
                </div>
              ) : (
                <button type="button" className="btn-aceitar"
                  style={accentColor ? accentBtnStyle(accentColor) : undefined}
                  onClick={() => {
                    const obj   = objectives[activeIdx]
                    const label = obj?.text ?? `Objetivo ${activeIdx + 1}`
                    onAgendar(raw.id, activeIdx, raw.title, label)
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

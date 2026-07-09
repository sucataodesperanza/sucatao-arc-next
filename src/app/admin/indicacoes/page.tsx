"use client"

import { useEffect, useState } from "react"
import { Users2, Clock, CheckCircle2, Gift, RefreshCw, XCircle } from "lucide-react"

type AdminReferral = {
  id: string
  referrer_id: string
  referred_id: string | null
  referrer_name: string | null
  referred_name: string | null
  code_used: string
  status: string
  registered_at: string | null
  confirmed_at: string | null
  reward_delivered_at: string | null
  cancelled_at: string | null
  created_at: string
  origin: string | null
}

const STATUS_LABEL: Record<string, string> = {
  registered:           "Cadastro Realizado",
  pending_requirements: "Requisitos Pendentes",
  confirmed:            "Confirmada",
  reward_delivered:     "Recompensa Entregue",
  cancelled:            "Cancelada",
}
const STATUS_COLOR: Record<string, string> = {
  registered:           "var(--yellow)",
  pending_requirements: "var(--cyan)",
  confirmed:            "var(--green)",
  reward_delivered:     "var(--purple)",
  cancelled:            "var(--gray-500)",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

const inp: React.CSSProperties = { background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, color: "var(--paper)", padding: "6px 10px", fontSize: 12, width: "100%" }
const btn = (color = "var(--yellow)"): React.CSSProperties => ({ background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 950, cursor: "pointer" })

export default function AdminIndicacoesPage() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState("")
  const [updating, setUpdating]   = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch("/api/admin/referrals").then(r => r.json()).then(d => {
      setReferrals(d.referrals ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch("/api/admin/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setUpdating(null)
    load()
  }

  const filtered = referrals.filter(r =>
    !filter ||
    r.referrer_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.referred_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.code_used.toLowerCase().includes(filter.toLowerCase()) ||
    r.status.includes(filter.toLowerCase())
  )

  const stats = {
    total:    referrals.length,
    pending:  referrals.filter(r => r.status === "registered" || r.status === "pending_requirements").length,
    confirmed: referrals.filter(r => r.status === "confirmed").length,
    delivered: referrals.filter(r => r.status === "reward_delivered").length,
  }

  const card: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "20px 24px" }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "var(--paper)" }}>Indicações</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { label: "Total",      value: stats.total,    icon: Users2,       color: "var(--cyan)"   },
          { label: "Pendentes",  value: stats.pending,  icon: Clock,        color: "var(--yellow)" },
          { label: "Confirmadas",value: stats.confirmed, icon: CheckCircle2, color: "var(--green)"  },
          { label: "Entregues",  value: stats.delivered, icon: Gift,         color: "var(--purple)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
            <s.icon size={22} style={{ color: s.color, flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: 22, fontWeight: 950, color: "var(--paper)" }}>{s.value}</strong>
              <p style={{ margin: 0, fontSize: 11, color: "var(--gray-500)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input style={{ ...inp, maxWidth: 300 }} placeholder="Filtrar por nome, código ou status..." value={filter} onChange={e => setFilter(e.target.value)} />
        <button type="button" onClick={load} style={btn()} disabled={loading}>
          <RefreshCw size={12} style={{ display: "inline", marginRight: 4 }} />{loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      {/* Tabela */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                {["Indicador", "Indicado", "Código", "Status", "Cadastro", "Confirmação", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--gray-500)", fontWeight: 950, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Nenhuma indicação encontrada.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--stroke)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "10px 14px", color: "var(--paper)", fontWeight: 700 }}>{r.referrer_name ?? r.referrer_id.slice(0, 8)}</td>
                  <td style={{ padding: "10px 14px", color: "var(--paper)" }}>{r.referred_name ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--cyan)", fontFamily: "monospace" }}>{r.code_used}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, padding: "3px 8px", borderRadius: 4, background: `color-mix(in srgb, ${STATUS_COLOR[r.status] ?? "var(--gray-500)"} 12%, transparent)`, color: STATUS_COLOR[r.status] ?? "var(--gray-500)", border: `1px solid color-mix(in srgb, ${STATUS_COLOR[r.status] ?? "var(--gray-500)"} 25%, transparent)`, whiteSpace: "nowrap" }}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-500)" }}>{fmtDate(r.registered_at)}</td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-500)" }}>{fmtDate(r.confirmed_at)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.status === "confirmed" && (
                        <button type="button" disabled={updating === r.id} onClick={() => updateStatus(r.id, "reward_delivered")} style={btn("var(--purple)")}>
                          <Gift size={11} style={{ display: "inline", marginRight: 3 }} />Entregar
                        </button>
                      )}
                      {(r.status === "registered" || r.status === "pending_requirements") && (
                        <button type="button" disabled={updating === r.id} onClick={() => updateStatus(r.id, "confirmed")} style={btn("var(--green)")}>
                          <CheckCircle2 size={11} style={{ display: "inline", marginRight: 3 }} />Confirmar
                        </button>
                      )}
                      {r.status !== "cancelled" && r.status !== "reward_delivered" && (
                        <button type="button" disabled={updating === r.id} onClick={() => updateStatus(r.id, "cancelled")} style={btn("var(--red)")}>
                          <XCircle size={11} style={{ display: "inline", marginRight: 3 }} />Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

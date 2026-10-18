"use client"

import { useEffect, useRef, useState } from "react"
import { Users2, Clock, CheckCircle2, Gift, RefreshCw, XCircle, Plus, Trash2, ToggleLeft, ToggleRight, Settings2, Search, X } from "lucide-react"

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

type RewardConfig = {
  id: string
  name: string
  description: string | null
  reward_type: "points" | "sucatas" | "item" | "raffle_tickets"
  reward_amount: number
  reward_amount_referred: number
  item_id: string | null
  item_name?: string | null
  sorteio_id: string | null
  sorteio_name?: string | null
  trigger_status: string
  active: boolean
  created_at: string
}

type CatalogItem = { id: string; name: string; icon_url: string | null }
type SorteioOption = { id: string; title: string; status: string }

type NewRewardForm = {
  name: string
  description: string
  reward_type: RewardConfig["reward_type"]
  reward_amount: number
  reward_amount_referred: number
  trigger_status: string
  item_id: string | null
  item_name: string
  sorteio_id: string | null
  sorteio_name: string
}
const EMPTY_REWARD: NewRewardForm = {
  name: "", description: "", reward_type: "points",
  reward_amount: 0, reward_amount_referred: 0,
  trigger_status: "confirmed", item_id: null, item_name: "",
  sorteio_id: null, sorteio_name: "",
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

const TRIGGER_OPTIONS = [
  { value: "registered",           label: "Cadastro Realizado" },
  { value: "pending_requirements", label: "Requisitos Pendentes" },
  { value: "confirmed",            label: "Confirmada" },
  { value: "reward_delivered",     label: "Recompensa Entregue" },
]

const REWARD_TYPE_OPTIONS = [
  { value: "points",         label: "Pontos de Reputação" },
  { value: "sucatas",        label: "Sucatas" },
  { value: "item",           label: "Item do Catálogo" },
  { value: "raffle_tickets", label: "Tickets de Sorteio" },
]

const REWARD_TYPE_COLOR: Record<string, string> = {
  points:         "var(--yellow)",
  sucatas:        "var(--cyan)",
  item:           "var(--purple)",
  raffle_tickets: "var(--green)",
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

const card: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "20px 24px" }
const inp: React.CSSProperties = { background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, color: "var(--paper)", padding: "6px 10px", fontSize: 12, width: "100%" }
const sel: React.CSSProperties = { ...inp, cursor: "pointer" }
const btn = (color = "var(--yellow)"): React.CSSProperties => ({ background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 950, cursor: "pointer" })

function ItemSearch({ value, label, onSelect, onClear }: {
  value: string | null
  label: string
  onSelect: (item: CatalogItem) => void
  onClear: () => void
}) {
  const [q, setQ]           = useState("")
  const [items, setItems]   = useState<CatalogItem[]>([])
  const [open, setOpen]     = useState(false)
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  function handleInput(v: string) {
    setQ(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!v.trim()) { setItems([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/admin/catalog?q=${encodeURIComponent(v)}&pageSize=20`)
      const data = await res.json().catch(() => ({}))
      setItems(data.items ?? [])
      setOpen(true)
      setSearching(false)
    }, 300)
  }

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, padding: "6px 10px" }}>
        <span style={{ fontSize: 12, color: "var(--paper)", flex: 1 }}>{label}</span>
        <button type="button" onClick={onClear} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 0, display: "flex" }}>
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--gray-500)", pointerEvents: "none" }} />
        <input
          style={{ ...inp, paddingLeft: 26 }}
          placeholder="Buscar item no catálogo..."
          value={q}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
          {searching ? (
            <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--gray-500)" }}>Buscando...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--gray-500)" }}>Nenhum item encontrado.</div>
          ) : items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSelect(item); setQ(""); setOpen(false) }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--stroke)", color: "var(--paper)", cursor: "pointer", textAlign: "left", fontSize: 12 }}
            >
              {item.icon_url && <img src={item.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain", opacity: 0.85 }} />}
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 10, color: "var(--gray-500)", fontFamily: "monospace" }}>{item.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SorteioSearch({ value, label, onSelect, onClear }: {
  value: string | null
  label: string
  onSelect: (s: SorteioOption) => void
  onClear: () => void
}) {
  const [sorteios, setSorteios] = useState<SorteioOption[]>([])
  const [q, setQ]               = useState("")
  const [open, setOpen]         = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/admin/sorteios").then(r => r.json()).then(d => {
      setSorteios((d.sorteios ?? []).filter((s: SorteioOption) => s.status === "active" || s.status === "upcoming"))
    })
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const filtered = sorteios.filter(s => !q || s.title.toLowerCase().includes(q.toLowerCase()))

  if (value) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, padding: "6px 10px" }}>
        <span style={{ fontSize: 12, color: "var(--paper)", flex: 1 }}>{label}</span>
        <button type="button" onClick={onClear} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 0, display: "flex" }}>
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <Search size={12} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--gray-500)", pointerEvents: "none" }} />
        <input
          style={{ ...inp, paddingLeft: 26 }}
          placeholder="Buscar sorteio ativo ou em breve..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--gray-500)" }}>Nenhum sorteio ativo ou em breve.</div>
          ) : filtered.map(s => (
            <button key={s.id} type="button"
              onClick={() => { onSelect(s); setQ(""); setOpen(false) }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--stroke)", color: "var(--paper)", cursor: "pointer", textAlign: "left", fontSize: 12 }}
            >
              <span style={{ flex: 1 }}>{s.title}</span>
              <span style={{ fontSize: 10, color: s.status === "active" ? "var(--green)" : "var(--yellow)", fontWeight: 950 }}>
                {s.status === "active" ? "ATIVO" : "EM BREVE"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminIndicacoesPage() {
  const [referrals, setReferrals]   = useState<AdminReferral[]>([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState("")
  const [updating, setUpdating]     = useState<string | null>(null)

  const [rewards, setRewards]               = useState<RewardConfig[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(true)
  const [savingReward, setSavingReward]     = useState(false)
  const [deletingReward, setDeletingReward] = useState<string | null>(null)
  const [newReward, setNewReward]           = useState<NewRewardForm>(EMPTY_REWARD)
  const [rewardError, setRewardError]       = useState("")

  function load() {
    setLoading(true)
    fetch("/api/admin/referrals").then(r => r.json()).then(d => {
      setReferrals(d.referrals ?? [])
    }).finally(() => setLoading(false))
  }

  function loadRewards() {
    setRewardsLoading(true)
    fetch("/api/admin/referral-rewards").then(r => r.json()).then(d => {
      setRewards(d.rewards ?? [])
    }).finally(() => setRewardsLoading(false))
  }

  useEffect(() => { load(); loadRewards() }, [])

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

  async function createReward() {
    setRewardError("")
    if (!newReward.name.trim()) { setRewardError("Nome é obrigatório."); return }
    if (newReward.reward_type === "item" && !newReward.item_id) { setRewardError("Selecione um item do catálogo."); return }
    if (newReward.reward_type === "raffle_tickets" && !newReward.sorteio_id) { setRewardError("Selecione um sorteio."); return }
    setSavingReward(true)
    const res = await fetch("/api/admin/referral-rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReward),
    })
    const data = await res.json()
    setSavingReward(false)
    if (!res.ok) { setRewardError(data.error ?? "Erro ao salvar."); return }
    setNewReward(EMPTY_REWARD)
    loadRewards()
  }

  async function toggleReward(id: string, active: boolean) {
    await fetch("/api/admin/referral-rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    })
    loadRewards()
  }

  async function deleteReward(id: string) {
    setDeletingReward(id)
    await fetch(`/api/admin/referral-rewards?id=${id}`, { method: "DELETE" })
    setDeletingReward(null)
    loadRewards()
  }

  const filtered = referrals.filter(r =>
    !filter ||
    r.referrer_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.referred_name?.toLowerCase().includes(filter.toLowerCase()) ||
    r.code_used.toLowerCase().includes(filter.toLowerCase()) ||
    r.status.includes(filter.toLowerCase())
  )

  const stats = {
    total:     referrals.length,
    pending:   referrals.filter(r => r.status === "registered" || r.status === "pending_requirements").length,
    confirmed: referrals.filter(r => r.status === "confirmed").length,
    delivered: referrals.filter(r => r.status === "reward_delivered").length,
  }

  const isItem    = newReward.reward_type === "item"
  const isRaffle  = newReward.reward_type === "raffle_tickets"
  const amtLabel    = (isItem || isRaffle) ? "Qtd — Indicador" : "Valor — Indicador (dono do link)"
  const amtRefLabel = (isItem || isRaffle) ? "Qtd — Indicado"  : "Valor — Indicado (quem usou o link)"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "var(--paper)" }}>Indicações</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { label: "Total",       value: stats.total,     icon: Users2,       color: "var(--cyan)"   },
          { label: "Pendentes",   value: stats.pending,   icon: Clock,        color: "var(--yellow)" },
          { label: "Confirmadas", value: stats.confirmed, icon: CheckCircle2, color: "var(--green)"  },
          { label: "Entregues",   value: stats.delivered, icon: Gift,         color: "var(--purple)" },
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

      {/* Tabela de indicações */}
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

      {/* ─── Configuração de Recompensas ─── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Settings2 size={16} style={{ color: "var(--yellow)" }} />
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: "var(--paper)" }}>Configuração de Recompensas</h2>
      </div>
      <p style={{ margin: "-16px 0 0", fontSize: 12, color: "var(--gray-500)" }}>
        Define quais recompensas são entregues automaticamente quando uma indicação atinge cada status.
      </p>

      {/* Formulário nova recompensa */}
      <div style={{ ...card }}>
        <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 950, color: "var(--paper)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Nova Recompensa</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Nome *</label>
            <input style={inp} placeholder="Ex: Bônus de Indicação" value={newReward.name} onChange={e => setNewReward(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descrição</label>
            <input style={inp} placeholder="Descrição opcional" value={newReward.description} onChange={e => setNewReward(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tipo de Recompensa *</label>
            <select style={sel} value={newReward.reward_type} onChange={e => setNewReward(p => ({ ...p, reward_type: e.target.value as RewardConfig["reward_type"], item_id: null, item_name: "", sorteio_id: null, sorteio_name: "" }))}>
              {REWARD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {isItem && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Item do Catálogo *</label>
              <ItemSearch
                value={newReward.item_id}
                label={newReward.item_name}
                onSelect={item => setNewReward(p => ({ ...p, item_id: item.id, item_name: item.name }))}
                onClear={() => setNewReward(p => ({ ...p, item_id: null, item_name: "" }))}
              />
            </div>
          )}
          {newReward.reward_type === "raffle_tickets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Sorteio *</label>
              <SorteioSearch
                value={newReward.sorteio_id}
                label={newReward.sorteio_name}
                onSelect={s => setNewReward(p => ({ ...p, sorteio_id: s.id, sorteio_name: s.title }))}
                onClear={() => setNewReward(p => ({ ...p, sorteio_id: null, sorteio_name: "" }))}
              />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>{amtLabel}</label>
            <input style={inp} type="number" min={0} placeholder="0" value={newReward.reward_amount} onChange={e => setNewReward(p => ({ ...p, reward_amount: Number(e.target.value) }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>{amtRefLabel}</label>
            <input style={inp} type="number" min={0} placeholder="0" value={newReward.reward_amount_referred} onChange={e => setNewReward(p => ({ ...p, reward_amount_referred: Number(e.target.value) }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Gatilho (status) *</label>
            <select style={sel} value={newReward.trigger_status} onChange={e => setNewReward(p => ({ ...p, trigger_status: e.target.value }))}>
              {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" disabled={savingReward} onClick={createReward} style={{ ...btn("var(--yellow)"), padding: "8px 16px", fontSize: 12, width: "100%" }}>
              <Plus size={13} style={{ display: "inline", marginRight: 4 }} />{savingReward ? "Salvando..." : "Adicionar Recompensa"}
            </button>
          </div>
        </div>
        {rewardError && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--red)" }}>{rewardError}</p>}
      </div>

      {/* Lista de recompensas configuradas */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--stroke)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 950, color: "var(--paper)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recompensas Cadastradas</span>
          <button type="button" onClick={loadRewards} style={btn()} disabled={rewardsLoading}>
            <RefreshCw size={11} style={{ display: "inline", marginRight: 3 }} />{rewardsLoading ? "..." : "Atualizar"}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                {["Nome", "Tipo / Item", "Indicador", "Indicado", "Gatilho", "Status", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--gray-500)", fontWeight: 950, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewardsLoading ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Carregando...</td></tr>
              ) : rewards.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Nenhuma recompensa configurada.</td></tr>
              ) : rewards.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < rewards.length - 1 ? "1px solid var(--stroke)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", opacity: r.active ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, color: "var(--paper)" }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: 10, color: "var(--gray-500)", marginTop: 2 }}>{r.description}</div>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, padding: "3px 8px", borderRadius: 4, background: `color-mix(in srgb, ${REWARD_TYPE_COLOR[r.reward_type] ?? "var(--gray-500)"} 12%, transparent)`, color: REWARD_TYPE_COLOR[r.reward_type] ?? "var(--gray-500)", border: `1px solid color-mix(in srgb, ${REWARD_TYPE_COLOR[r.reward_type] ?? "var(--gray-500)"} 25%, transparent)` }}>
                      {REWARD_TYPE_OPTIONS.find(o => o.value === r.reward_type)?.label ?? r.reward_type}
                    </span>
                    {r.reward_type === "item" && r.item_id && (
                      <div style={{ fontSize: 10, color: "var(--gray-500)", marginTop: 4, fontFamily: "monospace" }}>{r.item_name ?? r.item_id}</div>
                    )}
                    {r.reward_type === "raffle_tickets" && r.sorteio_id && (
                      <div style={{ fontSize: 10, color: "var(--green)", marginTop: 4 }}>{r.sorteio_name ?? r.sorteio_id}</div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--paper)", fontWeight: 700 }}>{r.reward_amount.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "10px 14px", color: "var(--cyan)", fontWeight: 700 }}>{r.reward_amount_referred.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-500)" }}>
                    {TRIGGER_OPTIONS.find(o => o.value === r.trigger_status)?.label ?? r.trigger_status}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, padding: "3px 8px", borderRadius: 4, background: r.active ? "color-mix(in srgb, var(--green) 12%, transparent)" : "color-mix(in srgb, var(--gray-500) 12%, transparent)", color: r.active ? "var(--green)" : "var(--gray-500)", border: `1px solid ${r.active ? "color-mix(in srgb, var(--green) 25%, transparent)" : "color-mix(in srgb, var(--gray-500) 25%, transparent)"}` }}>
                      {r.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" title={r.active ? "Desativar" : "Ativar"} onClick={() => toggleReward(r.id, r.active)} style={btn(r.active ? "var(--gray-500)" : "var(--green)")}>
                        {r.active
                          ? <><ToggleLeft size={12} style={{ display: "inline", marginRight: 3 }} />Desativar</>
                          : <><ToggleRight size={12} style={{ display: "inline", marginRight: 3 }} />Ativar</>
                        }
                      </button>
                      <button type="button" disabled={deletingReward === r.id} onClick={() => deleteReward(r.id)} style={btn("var(--red)")}>
                        <Trash2 size={11} style={{ display: "inline", marginRight: 3 }} />{deletingReward === r.id ? "..." : "Excluir"}
                      </button>
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

"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle, Plus, Trash2 } from "lucide-react"
import arcData from "@/data/arc-data"
import { getRarityLabel } from "@/lib/catalog"
import { rarityColors } from "@/lib/use-items-catalog"
import { useToast, useConfirm } from "@/components/admin-notifications"

type ArcItem = { id: string; name: string }
const allItemNames = [...new Set((arcData as unknown as { items: ArcItem[] }).items.map(i => i.name))]

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"]
const STATUS_LABELS: Record<string, string> = { active: "Ativo", paused: "Pausado", completed: "Concluído" }

type Trade = {
  id: string
  offer_points: number
  want_item_name: string
  want_item_qty: number
  want_item_icon: string | null
  want_item_rarity: string | null
  status: string
  expires_at: string | null
  created_at: string
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "13px", borderRadius: 4, font: "inherit",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase",
  cursor: "pointer", borderRadius: 4, font: "inherit",
}

const EMPTY_FORM = {
  offer_points: 0, want_item_name: "", want_item_qty: 1,
  want_item_rarity: "", want_item_icon: "", status: "active", expires_at: "",
}

export default function AdminTradesPage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [trades, setTrades]   = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Trade | null>(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [formOpen, setFormOpen]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [lookingUp, setLookingUp]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/trades")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setTrades(body.trades ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-preenche raridade e ícone ao digitar o nome do item
  useEffect(() => {
    const name = form.want_item_name.trim()
    if (!name || !formOpen) return

    const timer = setTimeout(async () => {
      setLookingUp(true)
      try {
        const res = await fetch(`/api/admin/catalog?q=${encodeURIComponent(name)}&pageSize=10`)
        const body = await res.json().catch(() => ({}))
        const items: Array<{ name: string; rarity: string | null; icon_url: string | null }> = body.items ?? []
        const exact = items.find(i => i.name.toLowerCase() === name.toLowerCase())
        if (exact) {
          setForm(f => ({
            ...f,
            want_item_rarity: exact.rarity ?? f.want_item_rarity,
            want_item_icon:   exact.icon_url ?? f.want_item_icon ?? "",
          }))
        }
      } finally {
        setLookingUp(false)
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [form.want_item_name, formOpen])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(t: Trade) {
    setEditing(t)
    setForm({
      offer_points: t.offer_points,
      want_item_name: t.want_item_name,
      want_item_qty: t.want_item_qty,
      want_item_rarity: t.want_item_rarity ?? "",
      want_item_icon:   t.want_item_icon   ?? "",
      status: t.status,
      expires_at: t.expires_at ? t.expires_at.slice(0, 16) : "",
    })
    setFormOpen(true)
  }

  async function handleSave() {
    setSaving(true)

    const body = {
      offer_points:     form.offer_points,
      want_item_name:   form.want_item_name.trim(),
      want_item_qty:    form.want_item_qty,
      want_item_rarity: form.want_item_rarity || null,
      want_item_icon:   form.want_item_icon   || null,
      status:           form.status,
      expires_at:       form.expires_at || null,
    }

    const url    = editing ? `/api/admin/trades/${editing.id}` : "/api/admin/trades"
    const method = editing ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      toast.success(editing ? "Trade atualizado!" : "Trade criado!")
      setEditing(null)
      setFormOpen(false)
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Erro ao salvar.")
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm("Remover este trade?")
    if (!ok) return
    await fetch(`/api/admin/trades/${id}`, { method: "DELETE" })
    await load()
  }

  async function patchStatus(id: string, status: string) {
    await fetch(`/api/admin/trades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await load()
  }


  return (
    <>
      <datalist id="trade-item-names">
        {allItemNames.map(n => <option key={n} value={n} />)}
      </datalist>

      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head">
          <strong>Trades do Sucatão</strong>
          <button
            type="button"
            onClick={openCreate}
            style={{ ...btnStyle, display: "inline-flex", alignItems: "center", gap: 6, borderColor: "var(--cyan)", color: "var(--cyan)" }}
          >
            <Plus size={14} /> Novo trade
          </button>
        </div>

        {/* Formulário inline */}
        {formOpen && (
          <div style={{ display: "grid", gap: 12, padding: "16px", border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255,255,255,0.02)", marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: "var(--paper)", fontWeight: 950 }}>
              {editing ? `Editando trade #${editing.id.slice(0, 8)}` : "Novo trade"}
            </strong>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Pontos oferecidos</span>
                <input type="number" min={0} value={form.offer_points}
                  onChange={e => setForm(f => ({ ...f, offer_points: Number(e.target.value) }))}
                  style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Quantidade desejada</span>
                <input type="number" min={1} value={form.want_item_qty}
                  onChange={e => setForm(f => ({ ...f, want_item_qty: Number(e.target.value) }))}
                  style={inputStyle} />
              </label>
            </div>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>
                Item desejado
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Thumbnail / loading */}
                <div style={{
                  width: 36, height: 36, borderRadius: 4, flexShrink: 0,
                  border: "1px solid var(--line)",
                  background: lookingUp
                    ? "linear-gradient(90deg, rgba(0,217,255,0.08) 25%, rgba(0,217,255,0.18) 50%, rgba(0,217,255,0.08) 75%)"
                    : "rgba(255,255,255,0.05)",
                  backgroundSize: lookingUp ? "200% 100%" : undefined,
                  animation: lookingUp ? "shimmer 1s infinite" : undefined,
                  display: "grid", placeItems: "center", overflow: "hidden",
                  transition: "background 0.2s",
                }}>
                  {!lookingUp && form.want_item_icon && (
                    <img src={form.want_item_icon} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  )}
                </div>
                <input type="text" list="trade-item-names" placeholder="Nome do item..."
                  value={form.want_item_name}
                  onChange={e => setForm(f => ({ ...f, want_item_name: e.target.value, want_item_rarity: "", want_item_icon: "" }))}
                  style={{
                    ...inputStyle, flex: 1,
                    borderColor: lookingUp ? "var(--cyan)" : undefined,
                    transition: "border-color 0.2s",
                  }} />
              </div>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>
                  Raridade
                  {form.want_item_rarity && <span style={{ marginLeft: 6, color: "var(--green)", fontWeight: 800 }}>auto</span>}
                </span>
                <select value={form.want_item_rarity}
                  onChange={e => setForm(f => ({ ...f, want_item_rarity: e.target.value }))}
                  style={{ ...inputStyle, color: form.want_item_rarity ? (rarityColors[form.want_item_rarity as keyof typeof rarityColors] ?? "inherit") : "inherit" }}>
                  <option value="">Sem raridade</option>
                  {RARITIES.map(r => <option key={r} value={r}>{getRarityLabel(r)}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Status</span>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={inputStyle}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Expira em</span>
                <input type="datetime-local" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  style={inputStyle} />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setFormOpen(false) }} style={btnStyle}>Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.want_item_name.trim()}
                style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar trade"}
              </button>
            </div>
          </div>
        )}

        {/* Tabela */}
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}>Item desejado</th>
                  <th style={{ padding: "8px" }}>Qtd</th>
                  <th style={{ padding: "8px" }}>Raridade</th>
                  <th style={{ padding: "8px" }}>Pontos oferecidos</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Expira</th>
                  <th style={{ padding: "8px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px", fontWeight: 800, cursor: "pointer" }} onClick={() => openEdit(t)}>
                      {t.want_item_name}
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{t.want_item_qty}×</td>
                    <td style={{ padding: "8px" }}>
                      {t.want_item_rarity ? (
                        <span style={{ color: rarityColors[t.want_item_rarity as keyof typeof rarityColors] ?? "var(--muted)", fontWeight: 950, fontSize: 11 }}>
                          {getRarityLabel(t.want_item_rarity)}
                        </span>
                      ) : <em style={{ opacity: 0.4 }}>—</em>}
                    </td>
                    <td style={{ padding: "8px", color: "var(--yellow)", fontWeight: 950 }}>
                      {t.offer_points.toLocaleString("pt-BR")} pts
                    </td>
                    <td style={{ padding: "8px" }}>
                      <select value={t.status} onChange={e => patchStatus(t.id, e.target.value)}
                        style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)", fontSize: 11 }}>
                      {t.expires_at ? new Date(t.expires_at).toLocaleDateString("pt-BR") : <em style={{ opacity: 0.4 }}>Sem prazo</em>}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <button type="button" onClick={() => handleDelete(t.id)}
                        style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {trades.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                    Nenhum trade cadastrado. Clique em &quot;Novo trade&quot; para criar.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slots de agendamento ── */}
      <SlotsSection />

      {/* ── Aceitações pendentes ── */}
      <AcceptancesSection />
    </>
  )
}

/* ── Slots ─────────────────────────────────────────────────────────────── */

type Slot = { id: string; label: string; scheduled_for: string; capacity: number; active: boolean }

function SlotsSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [slots, setSlots]     = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [label, setLabel]     = useState("")
  const [datetime, setDatetime] = useState("")
  const [capacity, setCapacity] = useState(1)
  const [saving, setSaving]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/trades/slots")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setSlots(body.slots ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createSlot() {
    if (!label || !datetime) return
    setSaving(true)
    const res = await fetch("/api/admin/trades/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, scheduled_for: datetime, capacity }),
    })
    setSaving(false)
    if (res.ok) { setLabel(""); setDatetime(""); setCapacity(1); toast.success("Slot criado!"); await load() }
    else toast.error("Erro ao criar slot.")
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/trades/slots/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    })
    await load()
  }

  async function deleteSlot(id: string) {
    const ok = await confirm("Remover slot?")
    if (!ok) return
    await fetch(`/api/admin/trades/slots/${id}`, { method: "DELETE" })
    await load()
  }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head">
        <strong>Slots de Agendamento In-Game</strong>
        <small>Admin cria os horários disponíveis para entrega</small>
      </div>

      {/* Formulário */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 10, marginBottom: 14, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Label do slot</span>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Sex 20/06 · 15:00 in-game"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 13, borderRadius: 4, font: "inherit" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Data e hora</span>
          <input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)}
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 13, borderRadius: 4, font: "inherit" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Vagas</span>
          <input type="number" min={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))}
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 13, borderRadius: 4, font: "inherit", width: 70 }} />
        </label>
        <button type="button" onClick={createSlot} disabled={saving || !label || !datetime}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, alignSelf: "end", font: "inherit" }}>
          <Plus size={12} /> {saving ? "..." : "Criar"}
        </button>
      </div>
      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ padding: "8px" }}>Label</th>
              <th style={{ padding: "8px" }}>Data/hora</th>
              <th style={{ padding: "8px" }}>Vagas</th>
              <th style={{ padding: "8px" }}>Status</th>
              <th style={{ padding: "8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {slots.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "8px", fontWeight: 800 }}>{s.label}</td>
                <td style={{ padding: "8px", color: "var(--muted)" }}>
                  {new Date(s.scheduled_for).toLocaleString("pt-BR")}
                </td>
                <td style={{ padding: "8px", color: "var(--muted)" }}>{s.capacity}</td>
                <td style={{ padding: "8px" }}>
                  <input type="checkbox" checked={s.active} onChange={e => toggleActive(s.id, e.target.checked)} />
                  <span style={{ marginLeft: 6, color: s.active ? "var(--green)" : "var(--muted)", fontSize: 11, fontWeight: 800 }}>
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td style={{ padding: "8px" }}>
                  <button type="button" onClick={() => deleteSlot(s.id)}
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {slots.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhum slot criado.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Aceitações ─────────────────────────────────────────────────────────── */

type Acceptance = {
  id: string; status: string; game_id: string | null; created_at: string
  slot_id: string | null
  trade_slots: { label: string; scheduled_for: string } | null
  trades: { id: string; offer_points: number; want_item_name: string; want_item_qty: number } | null
  user_id: string
  profiles: { name: string | null } | null
}

const ACCEPTANCE_STATUS: Record<string, string> = {
  pending: "Pendente", scheduled: "Agendado", completed: "Concluído",
}

function AcceptancesSection() {
  const toast = useToast()
  const [items, setItems]           = useState<Acceptance[]>([])
  const [loading, setLoading]       = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<Acceptance | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/trades/acceptances")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setItems(body.acceptances ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function completeTrade(id: string) {
    setCompleting(id)
    setConfirmModal(null)
    const res = await fetch(`/api/admin/trades/acceptances/${id}/complete`, { method: "POST" })
    setCompleting(null)
    if (res.ok) {
      const body = await res.json()
      toast.success(`✓ Trade concluído! ${body.points_credited} pts creditados.`)
      await load()
    } else {
      toast.error("Erro ao concluir trade.")
    }
  }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head">
        <strong>Aceitações de Trade</strong>
        <small>{items.filter(a => a.status !== "completed").length} pendentes</small>
      </div>
      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "8px" }}>Usuário</th>
                <th style={{ padding: "8px" }}>Game ID</th>
                <th style={{ padding: "8px" }}>Trade</th>
                <th style={{ padding: "8px" }}>Slot agendado</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: a.status === "completed" ? 0.5 : 1 }}>
                  <td style={{ padding: "8px", fontWeight: 800 }}>{a.profiles?.name ?? a.user_id.slice(0, 8)}</td>
                  <td style={{ padding: "8px", color: "var(--cyan)", fontFamily: "monospace" }}>
                    {a.game_id ?? <em style={{ opacity: 0.4 }}>—</em>}
                  </td>
                  <td style={{ padding: "8px", color: "var(--muted)" }}>
                    {a.trades ? `${a.trades.want_item_qty}× ${a.trades.want_item_name}` : "—"}
                    {a.trades && <span style={{ color: "var(--yellow)", marginLeft: 6, fontWeight: 950 }}>
                      +{a.trades.offer_points.toLocaleString("pt-BR")} pts
                    </span>}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {a.trade_slots
                      ? <span style={{ color: "var(--green)", fontWeight: 800 }}>{a.trade_slots.label}</span>
                      : <em style={{ opacity: 0.4, color: "var(--muted)" }}>Aguardando agendamento</em>}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ color: a.status === "completed" ? "var(--green)" : a.status === "scheduled" ? "var(--yellow)" : "var(--gray-500)", fontWeight: 950 }}>
                      {ACCEPTANCE_STATUS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    {a.status === "scheduled" && (
                      <button type="button" onClick={() => setConfirmModal(a)} disabled={completing === a.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "6px 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit", opacity: completing === a.id ? 0.6 : 1 }}>
                        <CheckCircle size={12} /> {completing === a.id ? "..." : "Concluir"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhuma aceitação registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de confirmação de conclusão ── */}
      {confirmModal && (
        <div className="modal-backdrop" onClick={() => setConfirmModal(null)}>
          <div
            style={{ background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 14, padding: 28, width: "min(480px,100%)", display: "flex", flexDirection: "column", gap: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(61,242,139,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <CheckCircle size={20} style={{ color: "var(--green)" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 950, fontSize: 14, color: "var(--paper)" }}>Confirmar Conclusão de Trade</p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--paper-dim)" }}>Confirme que o item foi entregue antes de creditar os pontos.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 8, padding: 14, border: "1px solid var(--stroke)", borderRadius: 8, background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
              {([
                { label: "Usuário",           value: confirmModal.profiles?.name ?? confirmModal.user_id.slice(0,8), mono: false, accent: undefined },
                { label: "Game ID",           value: confirmModal.game_id ?? "—", mono: true, accent: "var(--cyan)" },
                { label: "Item a receber",    value: `${confirmModal.trades?.want_item_qty}× ${confirmModal.trades?.want_item_name}`, mono: false, accent: undefined },
                { label: "Pontos a creditar", value: `${(confirmModal.trades?.offer_points ?? 0).toLocaleString("pt-BR")} pts`, mono: false, accent: "var(--yellow)" },
                { label: "Slot agendado",     value: confirmModal.trade_slots?.label ?? "—", mono: false, accent: undefined },
              ] as const).map(({ label, value, mono, accent }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--gray-500)", fontWeight: 800 }}>{label}</span>
                  <span style={{ color: accent ?? "var(--paper)", fontWeight: 950, fontFamily: mono ? "monospace" : undefined }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setConfirmModal(null)}
                style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper-dim)", padding: "9px 16px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit" }}>
                Cancelar
              </button>
              <button type="button" onClick={() => completeTrade(confirmModal.id)} disabled={completing === confirmModal.id}
                style={{ border: "1px solid rgba(61,242,139,0.5)", background: "rgba(61,242,139,0.12)", color: "var(--green)", padding: "9px 16px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 8, font: "inherit", opacity: completing === confirmModal.id ? 0.6 : 1 }}>
                {completing === confirmModal.id ? "Concluindo..." : "✓ Confirmar e Creditar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { Compass, Plus, X, Pencil, Trash2, Users, Package } from "lucide-react"

type Expedition = {
  id: string
  name: string
  description: string | null
  starts_at: string
  ends_at: string
  status: "scheduled" | "active" | "ended"
  slots_per_pack: number
  created_at: string
  totalPacks: number
  totalSlots: number
  buyers: number
}

type ExpeditionForm = {
  name: string
  description: string
  starts_at: string
  ends_at: string
  status: "scheduled" | "active" | "ended"
  slots_per_pack: number
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  active:    "Ativa",
  ended:     "Encerrada",
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: "#f59e0b",
  active:    "#22c55e",
  ended:     "#6b7280",
}

function toDatetimeLocal(iso: string) {
  if (!iso) return ""
  return iso.slice(0, 16)
}

function fromDatetimeLocal(local: string) {
  if (!local) return ""
  return new Date(local).toISOString()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

const BLANK_FORM: ExpeditionForm = {
  name: "",
  description: "",
  starts_at: "",
  ends_at: "",
  status: "scheduled",
  slots_per_pack: 20,
}

export default function AdminExpedicaoPage() {
  const [expeditions, setExpeditions] = useState<Expedition[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<ExpeditionForm>(BLANK_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ExpeditionForm>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/expedicao")
    if (res.ok) setExpeditions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ESC fecha modal de edição
  useEffect(() => {
    if (!editingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setEditingId(null) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [editingId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError("")
    const res = await fetch("/api/admin/expedicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...createForm,
        starts_at: fromDatetimeLocal(createForm.starts_at),
        ends_at:   fromDatetimeLocal(createForm.ends_at),
      }),
    })
    setCreating(false)
    if (res.ok) {
      setShowCreate(false)
      setCreateForm(BLANK_FORM)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setCreateError(d.error ?? "Erro ao criar expedição.")
    }
  }

  function openEdit(exp: Expedition) {
    setEditForm({
      name:          exp.name,
      description:   exp.description ?? "",
      starts_at:     toDatetimeLocal(exp.starts_at),
      ends_at:       toDatetimeLocal(exp.ends_at),
      status:        exp.status,
      slots_per_pack: exp.slots_per_pack,
    })
    setSaveError("")
    setEditingId(exp.id)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setSaving(true)
    setSaveError("")
    const res = await fetch(`/api/admin/expedicao/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        starts_at: fromDatetimeLocal(editForm.starts_at),
        ends_at:   fromDatetimeLocal(editForm.ends_at),
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEditingId(null)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? "Erro ao salvar.")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a expedição "${name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/expedicao/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Compass size={16} style={{ color: "#f59e0b" }} />
            <strong>Expedições</strong>
          </div>
          <button
            className="btn-sm"
            onClick={() => { setShowCreate(v => !v); setCreateError("") }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
          >
            <Plus size={13} />
            Nova Expedição
          </button>
        </div>

        {/* Formulário de criação inline */}
        {showCreate && (
          <form onSubmit={handleCreate} style={{ padding: "16px 0 4px", borderTop: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                Nome *
                <input
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Expedição Alpha"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                Slots por pacote
                <input
                  type="number"
                  min={1}
                  value={createForm.slots_per_pack}
                  onChange={e => setCreateForm(p => ({ ...p, slots_per_pack: Number(e.target.value) }))}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                Início *
                <input
                  required
                  type="datetime-local"
                  value={createForm.starts_at}
                  onChange={e => setCreateForm(p => ({ ...p, starts_at: e.target.value }))}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                Fim *
                <input
                  required
                  type="datetime-local"
                  value={createForm.ends_at}
                  onChange={e => setCreateForm(p => ({ ...p, ends_at: e.target.value }))}
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                />
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
              Descrição
              <textarea
                rows={2}
                value={createForm.description}
                onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Descrição opcional"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13, resize: "vertical" }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
              Status inicial
              <select
                value={createForm.status}
                onChange={e => setCreateForm(p => ({ ...p, status: e.target.value as ExpeditionForm["status"] }))}
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
              >
                <option value="scheduled">Agendada</option>
                <option value="active">Ativa</option>
                <option value="ended">Encerrada</option>
              </select>
            </label>
            {createError && <p style={{ color: "var(--red)", fontSize: 12, margin: 0 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={creating} style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {creating ? "Criando…" : "Criar Expedição"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: "var(--surface-2)", color: "var(--paper-dim)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de expedições */}
      {loading ? (
        <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Carregando…</p>
      ) : expeditions.length === 0 ? (
        <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Nenhuma expedição cadastrada.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {expeditions.map(exp => (
            <div
              key={exp.id}
              className="utility-panel"
              style={{ cursor: "pointer" }}
              onClick={() => openEdit(exp)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Status badge */}
                <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", background: `color-mix(in srgb, ${STATUS_COLOR[exp.status]} 15%, transparent)`, color: STATUS_COLOR[exp.status], border: `1px solid color-mix(in srgb, ${STATUS_COLOR[exp.status]} 30%, transparent)`, flexShrink: 0 }}>
                  {STATUS_LABEL[exp.status]}
                </span>

                {/* Nome */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--paper)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.name}</p>
                  {exp.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.description}</p>}
                </div>

                {/* Datas */}
                <div style={{ flexShrink: 0, textAlign: "right", fontSize: 11, color: "var(--gray-500)" }}>
                  <div>{formatDate(exp.starts_at)}</div>
                  <div>→ {formatDate(exp.ends_at)}</div>
                </div>

                {/* Métricas */}
                <div style={{ flexShrink: 0, display: "flex", gap: 12, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--gray-400)" }}>
                    <Users size={11} />
                    {exp.buyers}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--gray-400)" }}>
                    <Package size={11} />
                    {exp.totalPacks} packs · {exp.totalSlots} slots
                  </span>
                  <span style={{ color: "var(--gray-500)" }}>{exp.slots_per_pack} slots/pack</span>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(exp)}
                    style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, borderRadius: 4 }}
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id, exp.name)}
                    style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, borderRadius: 4 }}
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editingId && (() => {
        const exp = expeditions.find(e => e.id === editingId)!
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }}
            onClick={() => setEditingId(null)}
          >
            <div
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: 24, width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 15 }}>Editar Expedição</strong>
                <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                    Nome *
                    <input
                      required
                      value={editForm.name}
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                    Slots por pacote
                    <input
                      type="number"
                      min={1}
                      value={editForm.slots_per_pack}
                      onChange={e => setEditForm(p => ({ ...p, slots_per_pack: Number(e.target.value) }))}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                    Início *
                    <input
                      required
                      type="datetime-local"
                      value={editForm.starts_at}
                      onChange={e => setEditForm(p => ({ ...p, starts_at: e.target.value }))}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                    Fim *
                    <input
                      required
                      type="datetime-local"
                      value={editForm.ends_at}
                      onChange={e => setEditForm(p => ({ ...p, ends_at: e.target.value }))}
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                    />
                  </label>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                  Descrição
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13, resize: "vertical" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                  Status
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(p => ({ ...p, status: e.target.value as ExpeditionForm["status"] }))}
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13 }}
                  >
                    <option value="scheduled">Agendada</option>
                    <option value="active">Ativa</option>
                    <option value="ended">Encerrada</option>
                  </select>
                </label>

                {/* Stats da expedição */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "10px 0", borderTop: "1px solid var(--border-dim)" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>{exp.buyers}</div>
                    <div style={{ fontSize: 10, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Compradores</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{exp.totalPacks}</div>
                    <div style={{ fontSize: 10, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Packs vendidos</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#5fa8ff" }}>{exp.totalSlots}</div>
                    <div style={{ fontSize: 10, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Slots creditados</div>
                  </div>
                </div>

                {saveError && <p style={{ color: "var(--red)", fontSize: 12, margin: 0 }}>{saveError}</p>}

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={saving} style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "8px 20px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {saving ? "Salvando…" : "Salvar"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ background: "var(--surface-2)", color: "var(--paper-dim)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

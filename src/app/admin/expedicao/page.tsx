"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Compass, Plus, X, Pencil, Trash2, Users, Package, Upload, Image as ImageIcon } from "lucide-react"

type Expedition = {
  id: string
  name: string
  description: string | null
  starts_at: string
  ends_at: string
  status: "scheduled" | "active" | "ended"
  slots_per_pack: number
  item_name: string | null
  item_image_url: string | null
  price_points: number | null
  price_cash: number | null
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
  item_name: string
  price_points: string
  price_cash: string
}

const STATUS_LABEL: Record<string, string> = { scheduled: "Agendada", active: "Ativa", ended: "Encerrada" }
const STATUS_COLOR: Record<string, string>  = { scheduled: "#f59e0b", active: "#22c55e", ended: "#6b7280" }

function toDatetimeLocal(iso: string) { return iso ? iso.slice(0, 16) : "" }
function fromDatetimeLocal(local: string) { return local ? new Date(local).toISOString() : "" }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

const BLANK: ExpeditionForm = {
  name: "", description: "", starts_at: "", ends_at: "",
  status: "scheduled", slots_per_pack: 20, item_name: "", price_points: "", price_cash: "",
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border-dim)",
  borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13, width: "100%",
}
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 11, fontWeight: 700, color: "var(--gray-400)",
}

function FormFields({
  form, onChange,
}: { form: ExpeditionForm; onChange: (patch: Partial<ExpeditionForm>) => void }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>
          Nome da expedição *
          <input required value={form.name} onChange={e => onChange({ name: e.target.value })} placeholder="Ex: Expedição Alpha" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Nome do item na loja
          <input value={form.item_name} onChange={e => onChange({ item_name: e.target.value })} placeholder="Ex: Pacote de Cofre — Alpha" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Início *
          <input required type="datetime-local" value={form.starts_at} onChange={e => onChange({ starts_at: e.target.value })} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Fim *
          <input required type="datetime-local" value={form.ends_at} onChange={e => onChange({ ends_at: e.target.value })} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Preço em sucatas (pontos)
          <input type="number" min={0} value={form.price_points} onChange={e => onChange({ price_points: e.target.value })} placeholder="Ex: 5000" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Preço em R$ (PIX)
          <input type="number" min={0} step="0.01" value={form.price_cash} onChange={e => onChange({ price_cash: e.target.value })} placeholder="Ex: 9.90" style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Slots por pacote
          <input type="number" min={1} value={form.slots_per_pack} onChange={e => onChange({ slots_per_pack: Number(e.target.value) })} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Status
          <select value={form.status} onChange={e => onChange({ status: e.target.value as ExpeditionForm["status"] })} style={inputStyle}>
            <option value="scheduled">Agendada</option>
            <option value="active">Ativa</option>
            <option value="ended">Encerrada</option>
          </select>
        </label>
      </div>
      <label style={labelStyle}>
        Descrição
        <textarea rows={2} value={form.description} onChange={e => onChange({ description: e.target.value })} placeholder="Descrição opcional" style={{ ...inputStyle, resize: "vertical" }} />
      </label>
    </>
  )
}

function formToPayload(f: ExpeditionForm) {
  return {
    name:          f.name.trim(),
    description:   f.description.trim() || null,
    starts_at:     fromDatetimeLocal(f.starts_at),
    ends_at:       fromDatetimeLocal(f.ends_at),
    status:        f.status,
    slots_per_pack: Number(f.slots_per_pack),
    item_name:     f.item_name.trim() || null,
    price_points:  f.price_points !== "" ? Number(f.price_points) : null,
    price_cash:    f.price_cash   !== "" ? Number(f.price_cash)   : null,
  }
}

function expeditionToForm(exp: Expedition): ExpeditionForm {
  return {
    name:          exp.name,
    description:   exp.description ?? "",
    starts_at:     toDatetimeLocal(exp.starts_at),
    ends_at:       toDatetimeLocal(exp.ends_at),
    status:        exp.status,
    slots_per_pack: exp.slots_per_pack,
    item_name:     exp.item_name ?? "",
    price_points:  exp.price_points != null ? String(exp.price_points) : "",
    price_cash:    exp.price_cash   != null ? String(exp.price_cash)   : "",
  }
}

export default function AdminExpedicaoPage() {
  const [expeditions, setExpeditions] = useState<Expedition[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [createForm, setCreateForm]   = useState<ExpeditionForm>(BLANK)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState("")

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<ExpeditionForm>(BLANK)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState("")
  const [uploadingImg, setUploadingImg] = useState(false)
  const [editImgUrl, setEditImgUrl] = useState<string | null>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/expedicao")
    if (res.ok) setExpeditions(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!editingId) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setEditingId(null) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [editingId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError("")
    const res = await fetch("/api/admin/expedicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(createForm)),
    })
    setCreating(false)
    if (res.ok) { setShowCreate(false); setCreateForm(BLANK); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setCreateError(d.error ?? "Erro ao criar expedição.")
    }
  }

  function openEdit(exp: Expedition) {
    setEditForm(expeditionToForm(exp))
    setEditImgUrl(exp.item_image_url)
    setSaveError("")
    setEditingId(exp.id)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setSaving(true); setSaveError("")
    const res = await fetch(`/api/admin/expedicao/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(editForm)),
    })
    setSaving(false)
    if (res.ok) { setEditingId(null); load() }
    else {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? "Erro ao salvar.")
    }
  }

  async function handleImageUpload(file: File) {
    if (!editingId) return
    setUploadingImg(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/admin/expedicao/${editingId}/image`, { method: "POST", body: fd })
    setUploadingImg(false)
    if (res.ok) {
      const d = await res.json()
      setEditImgUrl(d.url)
      setExpeditions(prev => prev.map(ex => ex.id === editingId ? { ...ex, item_image_url: d.url } : ex))
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a expedição "${name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/expedicao/${id}`, { method: "DELETE" })
    load()
  }

  const btnPrimary: React.CSSProperties = { background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer" }
  const btnSecondary: React.CSSProperties = { background: "var(--surface-2)", color: "var(--paper-dim)", border: "1px solid var(--border-dim)", borderRadius: 6, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }

  return (
    <div>
      {/* Cabeçalho */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Compass size={16} style={{ color: "#f59e0b" }} />
            <strong>Expedições</strong>
          </div>
          <button onClick={() => { setShowCreate(v => !v); setCreateError("") }} style={btnPrimary}>
            <Plus size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Nova Expedição
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} style={{ padding: "16px 0 4px", borderTop: "1px solid var(--border-dim)", display: "flex", flexDirection: "column", gap: 12 }}>
            <FormFields form={createForm} onChange={p => setCreateForm(prev => ({ ...prev, ...p }))} />
            {createError && <p style={{ color: "var(--red)", fontSize: 12, margin: 0 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={creating} style={btnPrimary}>{creating ? "Criando…" : "Criar Expedição"}</button>
              <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>Cancelar</button>
            </div>
          </form>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Carregando…</p>
      ) : expeditions.length === 0 ? (
        <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Nenhuma expedição cadastrada.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {expeditions.map(exp => (
            <div key={exp.id} className="utility-panel" style={{ cursor: "pointer" }} onClick={() => openEdit(exp)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Imagem do item */}
                <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border-dim)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                  {exp.item_image_url
                    ? <img src={exp.item_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <ImageIcon size={16} style={{ color: "var(--gray-600)" }} />
                  }
                </div>

                {/* Status badge */}
                <span style={{ padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", background: `color-mix(in srgb, ${STATUS_COLOR[exp.status]} 15%, transparent)`, color: STATUS_COLOR[exp.status], border: `1px solid color-mix(in srgb, ${STATUS_COLOR[exp.status]} 30%, transparent)`, flexShrink: 0 }}>
                  {STATUS_LABEL[exp.status]}
                </span>

                {/* Nome */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--paper)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.name}</p>
                  {exp.item_name && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>Item: {exp.item_name}</p>}
                </div>

                {/* Datas */}
                <div style={{ flexShrink: 0, textAlign: "right", fontSize: 11, color: "var(--gray-500)" }}>
                  <div>{formatDate(exp.starts_at)}</div>
                  <div>→ {formatDate(exp.ends_at)}</div>
                </div>

                {/* Preços */}
                <div style={{ flexShrink: 0, fontSize: 11, textAlign: "right" }}>
                  {exp.price_points != null && <div style={{ color: "#f59e0b" }}>{exp.price_points.toLocaleString("pt-BR")} pts</div>}
                  {exp.price_cash   != null && <div style={{ color: "#22c55e" }}>R$ {exp.price_cash.toFixed(2).replace(".", ",")}</div>}
                </div>

                {/* Métricas */}
                <div style={{ flexShrink: 0, display: "flex", gap: 12, fontSize: 11, color: "var(--gray-400)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users size={11} /> {exp.buyers}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Package size={11} /> {exp.totalPacks} packs</span>
                  <span>{exp.slots_per_pack} slots/pack</span>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(exp)} style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, borderRadius: 4 }} title="Editar"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(exp.id, exp.name)} style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, borderRadius: 4 }} title="Excluir"><Trash2 size={13} /></button>
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
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }} onClick={() => setEditingId(null)}>
            <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-dim)", borderRadius: 12, padding: 24, width: "min(600px, 95vw)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 15 }}>Editar Expedição</strong>
                <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4 }}><X size={16} /></button>
              </div>

              {/* Imagem do item */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-dim)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                  {editImgUrl
                    ? <img src={editImgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <ImageIcon size={24} style={{ color: "var(--gray-600)" }} />
                  }
                </div>
                <div>
                  <p style={{ margin: "0 0 6px", fontSize: 11, color: "var(--gray-400)", fontWeight: 700 }}>Imagem do item na loja</p>
                  <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploadingImg} style={{ ...btnSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                    <Upload size={12} />
                    {uploadingImg ? "Enviando…" : "Trocar imagem"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormFields form={editForm} onChange={p => setEditForm(prev => ({ ...prev, ...p }))} />

                {/* Stats */}
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
                  <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: "8px 20px" }}>{saving ? "Salvando…" : "Salvar"}</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ ...btnSecondary, padding: "8px 14px" }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

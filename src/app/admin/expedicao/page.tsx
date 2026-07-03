"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Archive, CalendarClock, Compass, Plus, X, Pencil, Trash2, Users, Package, Upload, Image as ImageIcon, Star, Truck } from "lucide-react"

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
  featured: boolean
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

type DepositAdminItem = { name: string; rarity: string; quantity: number }
type DepositAdmin = {
  id: string; user_id: string; type: "deposit" | "pickup"
  items: DepositAdminItem[]; slots_used: number
  preferred_at: string | null; notes: string | null
  status: "scheduled" | "in_storage" | "returned" | "cancelled"
  admin_notes: string | null; created_at: string
  userName: string; gameId: string
}
const DEP_STATUS: Record<string, { label: string; color: string }> = {
  scheduled:  { label: "Agendado",   color: "#f59e0b" },
  in_storage: { label: "Em guarda",  color: "#5fa8ff" },
  returned:   { label: "Devolvido",  color: "#22c55e" },
  cancelled:  { label: "Cancelado",  color: "#6b7280" },
}
const DEP_NEXT: Record<string, string | null> = {
  scheduled:  "in_storage",
  in_storage: "returned",
  returned:   null,
  cancelled:  null,
}
const DEP_NEXT_LABEL: Record<string, string> = {
  scheduled:  "Marcar Em guarda",
  in_storage: "Marcar Devolvido",
}

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 14,
  cursor: "pointer",
  transition: "background 0.15s",
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "6px 10px", color: "var(--paper)", fontSize: 13, width: "100%",
}
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 11, fontWeight: 700, color: "var(--gray-400)",
}
const btnPrimary: React.CSSProperties = {
  background: "#f59e0b", color: "#000", border: "none",
  borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer",
}
const btnSecondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", color: "var(--paper-dim)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
  padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
}

function toDatetimeLocal(iso: string) { return iso ? iso.slice(0, 16) : "" }
function fromDatetimeLocal(local: string) { return local ? new Date(local).toISOString() : "" }
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

const BLANK: ExpeditionForm = {
  name: "", description: "", starts_at: "", ends_at: "",
  status: "scheduled", slots_per_pack: 20, item_name: "", price_points: "", price_cash: "",
}

function ImageThumb({ url, size = 72 }: { url: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
      {url
        ? <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <ImageIcon size={size * 0.35} style={{ color: "rgba(255,255,255,0.2)" }} />
      }
    </div>
  )
}

function ImageUploadBlock({
  preview, uploading, inputRef, onFile, label = "Imagem do item na loja",
}: {
  preview: string | null; uploading?: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onFile: (f: File) => void
  label?: string
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <ImageThumb url={preview} />
      <div>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: "var(--gray-400)", fontWeight: 700 }}>{label}</p>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          style={{ ...btnSecondary, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Upload size={12} />
          {uploading ? "Enviando…" : preview ? "Trocar imagem" : "Adicionar imagem"}
        </button>
      </div>
    </div>
  )
}

function FormFields({ form, onChange }: { form: ExpeditionForm; onChange: (p: Partial<ExpeditionForm>) => void }) {
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
          <select value={form.status} onChange={e => onChange({ status: e.target.value as ExpeditionForm["status"] })} style={{ ...inputStyle, appearance: "auto" }}>
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

export default function AdminExpedicaoPage() {
  const [adminTab, setAdminTab]       = useState<"expeditions" | "deposits">("expeditions")
  const [expeditions, setExpeditions] = useState<Expedition[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [createForm, setCreateForm]   = useState<ExpeditionForm>(BLANK)
  const [createImgFile, setCreateImgFile]     = useState<File | null>(null)
  const [createImgPreview, setCreateImgPreview] = useState<string | null>(null)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState("")
  const createImgRef = useRef<HTMLInputElement>(null)

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<ExpeditionForm>(BLANK)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState("")
  const [uploadingImg, setUploadingImg] = useState(false)
  const [editImgUrl, setEditImgUrl] = useState<string | null>(null)
  const editImgRef = useRef<HTMLInputElement>(null)

  const [deposits, setDeposits]       = useState<DepositAdmin[]>([])
  const [depExpedition, setDepExp]    = useState<{ id: string; name: string } | null>(null)
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [depAdminNotes, setDepAdminNotes] = useState<Record<string, string>>({})
  const [updatingDep, setUpdatingDep] = useState<string | null>(null)

  async function loadDeposits() {
    setLoadingDeps(true)
    const res = await fetch("/api/admin/expedicao/deposits")
    if (res.ok) {
      const d = await res.json()
      setDeposits(d.deposits ?? [])
      setDepExp(d.expedition ?? null)
    }
    setLoadingDeps(false)
  }

  async function advanceDepositStatus(id: string, nextStatus: string) {
    setUpdatingDep(id)
    await fetch(`/api/admin/expedicao/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, admin_notes: depAdminNotes[id] ?? undefined }),
    })
    setUpdatingDep(null)
    loadDeposits()
  }

  useEffect(() => {
    if (adminTab === "deposits") loadDeposits()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab])

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

  function selectCreateImg(file: File) {
    setCreateImgFile(file)
    setCreateImgPreview(URL.createObjectURL(file))
  }

  async function uploadImage(id: string, file: File) {
    const fd = new FormData()
    fd.append("file", file)
    await fetch(`/api/admin/expedicao/${id}/image`, { method: "POST", body: fd })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError("")
    const res = await fetch("/api/admin/expedicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formToPayload(createForm)),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCreateError(d.error ?? "Erro ao criar expedição.")
      setCreating(false)
      return
    }
    const created = await res.json()
    if (createImgFile) await uploadImage(created.id, createImgFile)
    setCreating(false)
    setShowCreate(false)
    setCreateForm(BLANK)
    setCreateImgFile(null)
    setCreateImgPreview(null)
    load()
  }

  function openEdit(exp: Expedition) {
    setEditForm({
      name:          exp.name,
      description:   exp.description ?? "",
      starts_at:     toDatetimeLocal(exp.starts_at),
      ends_at:       toDatetimeLocal(exp.ends_at),
      status:        exp.status,
      slots_per_pack: exp.slots_per_pack,
      item_name:     exp.item_name ?? "",
      price_points:  exp.price_points != null ? String(exp.price_points) : "",
      price_cash:    exp.price_cash   != null ? String(exp.price_cash)   : "",
    })
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

  async function handleEditImage(file: File) {
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

  async function handleToggleFeatured(e: React.MouseEvent, id: string, current: boolean) {
    e.stopPropagation()
    setExpeditions(prev => prev.map(ex => ex.id === id ? { ...ex, featured: !current } : ex))
    await fetch(`/api/admin/expedicao/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !current }),
    })
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a expedição "${name}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/expedicao/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[
          { key: "expeditions", icon: <Compass size={13} />, label: "Expedições" },
          { key: "deposits",    icon: <Archive size={13} />,  label: "Depósitos do Cofre" },
        ].map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setAdminTab(tab.key as typeof adminTab)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: adminTab === tab.key ? "1px solid rgba(245,158,11,0.40)" : "1px solid rgba(255,255,255,0.09)", background: adminTab === tab.key ? "rgba(245,158,11,0.10)" : "rgba(255,255,255,0.04)", color: adminTab === tab.key ? "#f59e0b" : "var(--gray-400)", fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.15s" }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {adminTab === "deposits" ? (
        /* ── Depósitos do Cofre ─────────────────────────────────────────────── */
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--paper)" }}>
                {depExpedition ? `Expedição: ${depExpedition.name}` : "Nenhuma expedição ativa"}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>{deposits.length} agendamentos</p>
            </div>
            <button type="button" onClick={loadDeposits} style={btnSecondary} disabled={loadingDeps}>
              {loadingDeps ? "Carregando…" : "↻ Atualizar"}
            </button>
          </div>

          {loadingDeps ? (
            <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Carregando…</p>
          ) : deposits.length === 0 ? (
            <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Nenhum agendamento encontrado.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deposits.map(dep => {
                const st   = DEP_STATUS[dep.status] ?? { label: dep.status, color: "#6b7280" }
                const next = DEP_NEXT[dep.status]
                const when = dep.preferred_at
                  ? new Date(dep.preferred_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                  : "A combinar"
                return (
                  <div key={dep.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 14 }}>
                    {/* Linha 1: status + tipo + jogador */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", background: `color-mix(in srgb, ${st.color} 14%, transparent)`, color: st.color, border: `1px solid color-mix(in srgb, ${st.color} 28%, transparent)` }}>
                        {st.label}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: dep.type === "deposit" ? "#f59e0b" : "#5fa8ff" }}>
                        {dep.type === "deposit" ? <Truck size={11} /> : <Archive size={11} />}
                        {dep.type === "deposit" ? "Entrega" : "Retirada"}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--paper)" }}>{dep.userName}</span>
                      <span style={{ fontSize: 11, color: "var(--gray-500)" }}>ID: {dep.gameId}</span>
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--gray-500)" }}>
                        <CalendarClock size={10} />{when}
                      </div>
                    </div>

                    {/* Linha 2: itens + slots */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: dep.type === "deposit" ? 6 : 0 }}>
                      {dep.items.map((it, idx) => (
                        <span key={idx} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "var(--paper)" }}>
                          {it.name} ×{it.quantity} <span style={{ color: "var(--gray-500)" }}>({it.rarity})</span>
                        </span>
                      ))}
                      {dep.type === "deposit" && (
                        <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "#f59e0b", fontWeight: 700 }}>
                          {dep.slots_used} slot{dep.slots_used !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {dep.notes && (
                      <p style={{ margin: "6px 0", fontSize: 11, color: "var(--gray-400)", fontStyle: "italic" }}>"{dep.notes}"</p>
                    )}

                    {/* Admin notes + ação */}
                    {next && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                        <input
                          type="text" placeholder="Nota interna (opcional)"
                          value={depAdminNotes[dep.id] ?? dep.admin_notes ?? ""}
                          onChange={e => setDepAdminNotes(prev => ({ ...prev, [dep.id]: e.target.value }))}
                          style={{ flex: 1, ...inputStyle, fontSize: 12 }}
                        />
                        <button type="button"
                          disabled={updatingDep === dep.id}
                          onClick={() => advanceDepositStatus(dep.id, next)}
                          style={{ ...btnPrimary, padding: "6px 14px", whiteSpace: "nowrap", background: next === "returned" ? "#22c55e" : "#f59e0b", color: next === "returned" ? "#000" : "#000" }}>
                          {updatingDep === dep.id ? "…" : DEP_NEXT_LABEL[dep.status] ?? "Avançar"}
                        </button>
                      </div>
                    )}
                    {dep.admin_notes && !next && (
                      <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--gray-500)" }}>Nota: {dep.admin_notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
      /* ── Expedições ───────────────────────────────────────────────────────── */
      <>
      {/* Cabeçalho + formulário de criação */}
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
          <form onSubmit={handleCreate} style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 14 }}>
            <ImageUploadBlock
              preview={createImgPreview}
              inputRef={createImgRef}
              onFile={selectCreateImg}
              label="Imagem do item na loja (opcional)"
            />
            <FormFields form={createForm} onChange={p => setCreateForm(prev => ({ ...prev, ...p }))} />
            {createError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{createError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={creating} style={btnPrimary}>
                {creating ? "Criando…" : "Criar Expedição"}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setCreateImgFile(null); setCreateImgPreview(null) }} style={btnSecondary}>
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
              style={CARD_STYLE}
              onClick={() => openEdit(exp)}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Miniatura */}
                <ImageThumb url={exp.item_image_url} size={40} />

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
                <div style={{ flexShrink: 0, fontSize: 11, textAlign: "right", minWidth: 80 }}>
                  {exp.price_points != null && <div style={{ color: "#f59e0b" }}>{exp.price_points.toLocaleString("pt-BR")} pts</div>}
                  {exp.price_cash   != null && <div style={{ color: "#22c55e" }}>R$ {exp.price_cash.toFixed(2).replace(".", ",")}</div>}
                </div>

                {/* Métricas */}
                <div style={{ flexShrink: 0, display: "flex", gap: 12, fontSize: 11, color: "var(--gray-500)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users size={11} /> {exp.buyers}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Package size={11} /> {exp.totalPacks} packs</span>
                  <span>{exp.slots_per_pack} slots/pack</span>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => handleToggleFeatured(e, exp.id, exp.featured)}
                    title={exp.featured ? "Remover dos destaques" : "Colocar nos destaques"}
                    style={{ background: exp.featured ? "rgba(245,158,11,0.15)" : "transparent", border: exp.featured ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent", color: exp.featured ? "#f59e0b" : "var(--gray-600)", cursor: "pointer", padding: 4, borderRadius: 6, display: "grid", placeItems: "center", transition: "all 0.15s" }}
                  >
                    <Star size={13} fill={exp.featured ? "#f59e0b" : "none"} />
                  </button>
                  <button onClick={() => openEdit(exp)} style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, borderRadius: 4 }} title="Editar"><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(exp.id, exp.name)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 4, borderRadius: 4 }} title="Excluir"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editingId && (adminTab === "expeditions") && (() => {
        const exp = expeditions.find(e => e.id === editingId)!
        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
            onClick={() => setEditingId(null)}
          >
            <div
              style={{ background: "#0e1520", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 24, width: "min(600px, 95vw)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 15, color: "var(--paper)" }}>Editar Expedição</strong>
                <button onClick={() => setEditingId(null)} style={{ background: "transparent", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4 }}><X size={16} /></button>
              </div>

              <ImageUploadBlock
                preview={editImgUrl}
                uploading={uploadingImg}
                inputRef={editImgRef}
                onFile={handleEditImage}
              />

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormFields form={editForm} onChange={p => setEditForm(prev => ({ ...prev, ...p }))} />

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    { label: "Compradores",    value: exp.buyers,     color: "#22c55e" },
                    { label: "Packs vendidos", value: exp.totalPacks, color: "#f59e0b" },
                    { label: "Slots creditados", value: exp.totalSlots, color: "#5fa8ff" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                      <div style={{ fontSize: 10, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {saveError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{saveError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={saving} style={{ ...btnPrimary, padding: "8px 20px" }}>{saving ? "Salvando…" : "Salvar"}</button>
                  <button type="button" onClick={() => setEditingId(null)} style={{ ...btnSecondary, padding: "8px 14px" }}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}
      </>
      )}
    </div>
  )
}

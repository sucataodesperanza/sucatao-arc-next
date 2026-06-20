"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ImagePlus, Plus, Trash2, X } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

type RewardItem = {
  id: string; name: string; description: string | null; image_url: string | null
  price: number; stock: number; featured: boolean; active: boolean; expires_at: string | null
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
const EMPTY = { name: "", description: "", image_url: "", price: 0, stock: 0, featured: false, expires_at: "" }

export default function AdminRecompensasPage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [items, setItems]     = useState<RewardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RewardItem | null>(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/reward-items")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setItems(body.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY); setFormOpen(true) }

  function openEdit(item: RewardItem) {
    setEditing(item)
    setForm({
      name: item.name, description: item.description ?? "", image_url: item.image_url ?? "",
      price: item.price, stock: item.stock, featured: item.featured,
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : "",
    })
    setFormOpen(true)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
    const body = await res.json().catch(() => ({}))
    setUploading(false)
    if (res.ok) {
      setForm(f => ({ ...f, image_url: body.url }))
    } else {
      toast.error(body.error ?? "Erro ao fazer upload.")
    }
    // Reset input para permitir re-upload do mesmo arquivo
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      name: form.name.trim(), description: form.description || null,
      image_url: form.image_url || null, price: form.price, stock: form.stock,
      featured: form.featured, expires_at: form.expires_at || null,
    }
    const url    = editing ? `/api/admin/reward-items/${editing.id}` : "/api/admin/reward-items"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { toast.success(editing ? "Atualizado!" : "Criado!"); setFormOpen(false); setEditing(null); await load() }
    else { const err = await res.json().catch(() => ({})); toast.error(err.error ?? "Erro.") }
  }

  async function patchItem(id: string, patch: Record<string, unknown>) {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } as RewardItem : i))
    const res = await fetch(`/api/admin/reward-items/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    })
    if (res.ok) {
      const label = "featured" in patch
        ? (patch.featured ? "Marcado como destaque!" : "Removido do destaque.")
        : "active" in patch
          ? (patch.active ? "Item ativado!" : "Item desativado.")
          : "Salvo!"
      toast.success(label)
    } else {
      // Reverte o optimistic update em caso de erro
      toast.error("Erro ao salvar. Tente novamente.")
      await load()
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm("Remover item?")
    if (!ok) return
    await fetch(`/api/admin/reward-items/${id}`, { method: "DELETE" })
    await load()
  }

  return (
    <>
      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Itens de Recompensa</strong>
          <button type="button" onClick={openCreate}
            style={{ ...btnStyle, display: "inline-flex", alignItems: "center", gap: 6, borderColor: "var(--cyan)", color: "var(--cyan)" }}>
            <Plus size={14} /> Novo item
          </button>
        </div>
        <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: 12 }}>
          Gift cards, merch, sorteios — itens de recompensa que aparecem nos "Destaques da semana" da loja.
        </p>

        {/* Formulário */}
        {formOpen && (
          <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "rgba(255,255,255,0.02)", marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: "var(--paper)", fontWeight: 950 }}>
              {editing ? "Editar item" : "Novo item de recompensa"}
            </strong>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Nome *</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Gift Card Steam R$50" style={inputStyle} />
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Descrição</span>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição opcional" style={inputStyle} />
            </label>

            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Imagem</span>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {/* Preview */}
                <div style={{
                  width: 72, height: 72, borderRadius: 8, flexShrink: 0,
                  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)",
                  display: "grid", placeItems: "center", overflow: "hidden",
                }}>
                  {form.image_url
                    ? <img src={form.image_url} alt="preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <ImagePlus size={20} style={{ color: "var(--gray-500)" }} />}
                </div>
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  {/* Botão de upload */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={handleUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ ...btnStyle, display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", opacity: uploading ? 0.6 : 1 }}
                  >
                    <ImagePlus size={13} />
                    {uploading ? "Enviando..." : "Importar imagem"}
                  </button>
                  {/* URL manual (fallback) */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="ou cole uma URL..."
                      style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                    />
                    {form.image_url && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                        style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, display: "flex" }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--gray-500)" }}>JPG, PNG, WEBP ou GIF · máx 4 MB</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Preço (pts)</span>
                <input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Estoque</span>
                <input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Expira em</span>
                <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
              </label>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--paper-dim)" }}>Destaque da semana (aparece no painel da loja)</span>
            </label>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setFormOpen(false); setEditing(null) }} style={btnStyle}>Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving || !form.name.trim()}
                style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        )}

        {/* Tabela */}
        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}></th>
                  <th style={{ padding: "8px" }}>Nome</th>
                  <th style={{ padding: "8px" }}>Preço</th>
                  <th style={{ padding: "8px" }}>Estoque</th>
                  <th style={{ padding: "8px" }}>Destaque</th>
                  <th style={{ padding: "8px" }}>Ativo</th>
                  <th style={{ padding: "8px" }}>Expira</th>
                  <th style={{ padding: "8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "6px 8px" }}>
                      {item.image_url && <img src={item.image_url} alt={item.name} style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />}
                    </td>
                    <td style={{ padding: "6px 8px", fontWeight: 800, cursor: "pointer" }} onClick={() => openEdit(item)}>{item.name}</td>
                    <td style={{ padding: "6px 8px", color: "var(--yellow)", fontWeight: 950 }}>{item.price.toLocaleString("pt-BR")} pts</td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{item.stock}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <input type="checkbox" checked={item.featured} onChange={e => patchItem(item.id, { featured: e.target.checked })} />
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <input type="checkbox" checked={item.active} onChange={e => patchItem(item.id, { active: e.target.checked })} />
                    </td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)", fontSize: 11 }}>
                      {item.expires_at ? new Date(item.expires_at).toLocaleString("pt-BR") : <em style={{ opacity: 0.4 }}>—</em>}
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      <button type="button" onClick={() => handleDelete(item.id)}
                        style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                    Nenhum item de recompensa. Clique em &quot;Novo item&quot; para criar.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

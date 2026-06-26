"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Trash2, Upload, Plus, Edit2, Check, X } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"
import type { Faction } from "@/app/api/faccoes/route"

type Activity = {
  id: string
  text: string
  created_at: string
  factions: { id: string; name: string; color: string; slug: string }
}

/* ── Inline editable cell ── */
function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (!editing) return (
    <span style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => { setDraft(value); setEditing(true) }}>
      {value || <em style={{ color: "var(--gray-500)" }}>—</em>}
      <Edit2 size={11} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
    </span>
  )
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "3px 7px", borderRadius: 4, font: "inherit", fontSize: 12, width: 180 }} />
      <button type="button" onClick={() => { onSave(draft); setEditing(false) }} style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer", padding: 2 }}><Check size={14} /></button>
      <button type="button" onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 2 }}><X size={14} /></button>
    </span>
  )
}

/* ── Seção de facções ── */
function FacoesSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [factions, setFactions] = useState<Faction[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/faccoes")
    const body = await res.json().catch(() => ({}))
    setFactions(body.factions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patchFaction(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/faccoes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    await load()
  }

  async function uploadIcon(id: string, file: File) {
    setUploadingId(id)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/admin/faccoes/${id}/icon`, { method: "POST", body: fd })
    setUploadingId(null)
    if (res.ok) { toast.success("Ícone atualizado!"); await load() }
    else toast.error("Erro ao fazer upload do ícone.")
  }

  async function deleteFaction(id: string, name: string) {
    const ok = await confirm(`Remover a facção "${name}"? Isso removerá todas as filiações.`)
    if (!ok) return
    await fetch(`/api/admin/faccoes/${id}`, { method: "DELETE" })
    toast.success("Facção removida.")
    await load()
  }

  async function patchBonuses(id: string, raw: string) {
    const bonuses = raw.split("\n").map(s => s.trim()).filter(Boolean)
    await patchFaction(id, { bonuses })
    toast.success("Bônus salvo.")
  }

  const th = { padding: "8px", textAlign: "left" as const, fontSize: 10, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--gray-500)", whiteSpace: "nowrap" as const }
  const td = { padding: "8px", verticalAlign: "top" as const, fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }

  return (
    <div className="utility-panel">
      <div className="utility-panel-head">
        <strong>Facções</strong>
        <small>Edite nome, cor, bônus e ícone de cada facção</small>
      </div>

      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                <th style={th}>Ícone</th>
                <th style={th}>Nome</th>
                <th style={th}>Tagline</th>
                <th style={th}>Cor</th>
                <th style={th}>Ativo</th>
                <th style={th}>Bônus (1 por linha)</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {factions.map(f => (
                <tr key={f.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {/* Ícone */}
                  <td style={td}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: `color-mix(in srgb, ${f.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${f.color} 30%, transparent)`, display: "grid", placeItems: "center", overflow: "hidden" }}>
                        {f.icon_url ? <img src={f.icon_url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Upload size={18} style={{ color: f.color, opacity: 0.5 }} />}
                      </div>
                      <input ref={el => { fileRefs.current[f.id] = el }} type="file" accept="image/*,.svg" style={{ display: "none" }}
                        onChange={e => { const file = e.target.files?.[0]; if (file) uploadIcon(f.id, file) }} />
                      <button type="button" onClick={() => fileRefs.current[f.id]?.click()} disabled={uploadingId === f.id}
                        style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", background: "none", border: "1px solid rgba(0,217,255,0.3)", borderRadius: 4, padding: "3px 6px", cursor: "pointer", font: "inherit" }}>
                        {uploadingId === f.id ? "..." : "Upload"}
                      </button>
                    </div>
                  </td>
                  {/* Nome */}
                  <td style={td}><EditableCell value={f.name} onSave={v => patchFaction(f.id, { name: v })} /></td>
                  {/* Tagline */}
                  <td style={{ ...td, maxWidth: 160 }}><EditableCell value={f.tagline} onSave={v => patchFaction(f.id, { tagline: v })} /></td>
                  {/* Cor */}
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="color" value={f.color} style={{ width: 28, height: 28, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                        onChange={e => patchFaction(f.id, { color: e.target.value })} />
                      <span style={{ fontFamily: "monospace", fontSize: 11 }}>{f.color}</span>
                    </div>
                  </td>
                  {/* Ativo */}
                  <td style={td}>
                    <input type="checkbox" checked={f.active} onChange={e => patchFaction(f.id, { active: e.target.checked })} />
                  </td>
                  {/* Bônus */}
                  <td style={{ ...td, minWidth: 220 }}>
                    <BonusEditor bonuses={f.bonuses ?? []} onSave={raw => patchBonuses(f.id, raw)} />
                  </td>
                  {/* Ações */}
                  <td style={td}>
                    <button type="button" onClick={() => deleteFaction(f.id, f.name)}
                      style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {factions.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhuma facção cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BonusEditor({ bonuses, onSave }: { bonuses: string[]; onSave: (raw: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(bonuses.join("\n"))

  if (!editing) return (
    <div style={{ cursor: "pointer" }} onClick={() => { setDraft(bonuses.join("\n")); setEditing(true) }}>
      {bonuses.length === 0
        ? <em style={{ color: "var(--gray-500)", fontSize: 11 }}>Clique para editar</em>
        : <ul style={{ margin: 0, padding: "0 0 0 14px", lineHeight: 1.7 }}>{bonuses.map((b, i) => <li key={i}>{b}</li>)}</ul>}
    </div>
  )
  return (
    <div>
      <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3}
        style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "6px 8px", borderRadius: 4, font: "inherit", fontSize: 11, resize: "vertical", boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button type="button" onClick={() => { onSave(draft); setEditing(false) }}
          style={{ background: "rgba(61,242,139,0.1)", border: "1px solid rgba(61,242,139,0.3)", color: "var(--green)", padding: "3px 8px", fontSize: 10, fontWeight: 950, cursor: "pointer", borderRadius: 4, font: "inherit" }}>
          Salvar
        </button>
        <button type="button" onClick={() => setEditing(false)}
          style={{ background: "none", border: "1px solid var(--stroke)", color: "var(--muted)", padding: "3px 8px", fontSize: 10, cursor: "pointer", borderRadius: 4, font: "inherit" }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

/* ── Seção de atividades ── */
function AtividadesSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [activity, setActivity] = useState<Activity[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [loading, setLoading] = useState(true)
  const [factionId, setFactionId] = useState("")
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [aRes, fRes] = await Promise.all([
      fetch("/api/admin/faccoes/activity").then(r => r.json()).catch(() => ({})),
      fetch("/api/admin/faccoes").then(r => r.json()).catch(() => ({})),
    ])
    setActivity(aRes.activity ?? [])
    setFactions(fRes.factions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addActivity() {
    if (!factionId || !text.trim()) return
    setSaving(true)
    const res = await fetch("/api/admin/faccoes/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faction_id: factionId, text: text.trim() }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Atividade adicionada!"); setText(""); await load() }
    else toast.error("Erro ao adicionar atividade.")
  }

  async function deleteActivity(id: string) {
    const ok = await confirm("Remover esta atividade?")
    if (!ok) return
    await fetch(`/api/admin/faccoes/activity/${id}`, { method: "DELETE" })
    await load()
  }

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 10px", fontSize: 13, borderRadius: 4, font: "inherit" }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head">
        <strong>Feed de Atividades</strong>
        <small>Mensagens exibidas no painel lateral da tela de Facções</small>
      </div>

      {/* Formulário */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 10, marginBottom: 16, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Facção</span>
          <select value={factionId} onChange={e => setFactionId(e.target.value)} style={{ ...inp }}>
            <option value="">Selecionar...</option>
            {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Texto da atividade</span>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Os Catadores concluíram 1.250 entregas hoje" style={inp} />
        </label>
        <button type="button" onClick={addActivity} disabled={saving || !factionId || !text.trim()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, alignSelf: "end", font: "inherit", opacity: (!factionId || !text.trim()) ? 0.5 : 1 }}>
          <Plus size={12} /> {saving ? "..." : "Adicionar"}
        </button>
      </div>

      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--stroke)" }}>
              <th style={{ padding: "8px" }}>Facção</th>
              <th style={{ padding: "8px" }}>Texto</th>
              <th style={{ padding: "8px" }}>Data</th>
              <th style={{ padding: "8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {activity.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "8px" }}>
                  <span style={{ color: a.factions?.color ?? "var(--paper)", fontWeight: 800 }}>{a.factions?.name ?? "—"}</span>
                </td>
                <td style={{ padding: "8px" }}>{a.text}</td>
                <td style={{ padding: "8px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td style={{ padding: "8px" }}>
                  <button type="button" onClick={() => deleteActivity(a.id)}
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {activity.length === 0 && (
              <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhuma atividade cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Página principal ── */
export default function AdminFaccoesPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>FACÇÕES</h1>
      </div>
      <FacoesSection />
      <AtividadesSection />
    </div>
  )
}

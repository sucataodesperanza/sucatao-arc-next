"use client"

import { useCallback, useEffect, useState } from "react"
import { Trash2, Plus, RefreshCw, MapPin } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

type MapRow = { id: string; name: string; label: string; description: string; image_url: string | null; status: string; index: number }
type Marker = { id: string; map_id: string; type: string; x: number; y: number; title: string; note: string; active: boolean }

const TYPES = ["loot", "extract", "key", "danger", "route"]
const TYPE_COLORS: Record<string, string> = {
  loot: "#ffd400", extract: "#3df28b", key: "#b477ff", danger: "#ff6171", route: "#00d9ff"
}

function EditCell({ value, onSave, multiline }: { value: string; onSave: (v: string) => void; multiline?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (!editing) return (
    <span style={{ cursor: "pointer", color: value ? "var(--paper)" : "rgba(255,255,255,0.2)", fontStyle: value ? "normal" : "italic" }}
      onClick={() => { setDraft(value); setEditing(true) }}>
      {value || "—"}
    </span>
  )
  const props = { autoFocus: true, value: draft, onChange: (e: any) => setDraft(e.target.value),
    style: { background: "rgba(0,0,0,0.4)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "3px 7px", borderRadius: 4, font: "inherit", fontSize: 12, width: "100%" } }
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {multiline ? <textarea {...props} rows={2} style={{ ...props.style, resize: "vertical" }} /> : <input {...props} />}
      <button type="button" onClick={() => { onSave(draft); setEditing(false) }} style={{ background: "none", border: "none", color: "var(--green)", cursor: "pointer" }}>✓</button>
      <button type="button" onClick={() => setEditing(false)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}>✕</button>
    </span>
  )
}

function MarkersPanel({ map, onClose }: { map: MapRow; onClose: () => void }) {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ type: "loot", x: 50, y: 50, title: "", note: "" })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/mapas/${map.id}/markers`)
    const body = await res.json().catch(() => ({}))
    setMarkers(body.markers ?? [])
    setLoading(false)
  }, [map.id])

  useEffect(() => { load() }, [load])

  async function addMarker() {
    if (!form.title) return toast.error("Título obrigatório.")
    const res = await fetch(`/api/admin/mapas/${map.id}/markers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    })
    if (res.ok) { toast.success("Marcador adicionado!"); setForm({ type: "loot", x: 50, y: 50, title: "", note: "" }); await load() }
    else toast.error("Erro ao adicionar marcador.")
  }

  async function patchMarker(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/mapas/markers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
    await load()
  }

  async function deleteMarker(id: string) {
    const ok = await confirm("Remover este marcador?")
    if (!ok) return
    await fetch(`/api/admin/mapas/markers/${id}`, { method: "DELETE" })
    await load()
  }

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "6px 8px", fontSize: 12, borderRadius: 4, font: "inherit" }

  return (
    <div style={{ marginTop: 12, padding: 16, background: "rgba(0,0,0,0.2)", borderRadius: 8, border: "1px solid var(--stroke)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)" }}>
          <MapPin size={12} style={{ marginRight: 4 }} />Marcadores — {map.name}
        </span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", fontSize: 14 }}>✕ Fechar</button>
      </div>

      {/* Formulário de adição */}
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 60px 60px auto", gap: 8, marginBottom: 12, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Tipo</span>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inp}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Título</span>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inp} placeholder="Nome do ponto" />
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Nota</span>
          <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} style={inp} placeholder="Opcional" />
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>X %</span>
          <input type="number" min={0} max={100} value={form.x} onChange={e => setForm(p => ({ ...p, x: Number(e.target.value) }))} style={inp} />
        </label>
        <label style={{ display: "grid", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Y %</span>
          <input type="number" min={0} max={100} value={form.y} onChange={e => setForm(p => ({ ...p, y: Number(e.target.value) }))} style={inp} />
        </label>
        <button type="button" onClick={addMarker} style={{ alignSelf: "end", display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "7px 10px", fontSize: 11, fontWeight: 950, cursor: "pointer", borderRadius: 4, font: "inherit" }}>
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Tabela de marcadores */}
      {loading ? <p style={{ color: "var(--muted)", fontSize: 12 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
              {["Tipo", "Título", "Nota", "X", "Y", "Ativo", ""].map(h => (
                <th key={h} style={{ padding: "6px 8px", fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {markers.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 8px" }}>
                  <span style={{ fontSize: 10, fontWeight: 950, color: TYPE_COLORS[m.type] ?? "var(--paper)" }}>{m.type}</span>
                </td>
                <td style={{ padding: "6px 8px" }}><EditCell value={m.title} onSave={v => patchMarker(m.id, { title: v })} /></td>
                <td style={{ padding: "6px 8px", maxWidth: 200 }}><EditCell value={m.note} onSave={v => patchMarker(m.id, { note: v })} multiline /></td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" min={0} max={100} defaultValue={m.x}
                    onBlur={async e => { await patchMarker(m.id, { x: Number(e.target.value) }) }}
                    style={{ ...inp, width: 52, textAlign: "right" }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" min={0} max={100} defaultValue={m.y}
                    onBlur={async e => { await patchMarker(m.id, { y: Number(e.target.value) }) }}
                    style={{ ...inp, width: 52, textAlign: "right" }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="checkbox" checked={m.active} onChange={e => patchMarker(m.id, { active: e.target.checked })} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <button type="button" onClick={() => deleteMarker(m.id)}
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 2, display: "flex" }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {markers.length === 0 && <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>Nenhum marcador.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function AdminMapasPage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [maps, setMaps]           = useState<MapRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncing, setSyncing]     = useState(false)
  const [activeMap, setActiveMap] = useState<MapRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/mapas")
    const body = await res.json().catch(() => ({}))
    setMaps(body.maps ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patchMap(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/mapas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
    await load()
  }

  async function deleteMap(id: string, name: string) {
    const ok = await confirm(`Remover mapa "${name}" e todos os seus marcadores?`)
    if (!ok) return
    await fetch(`/api/admin/mapas/${id}`, { method: "DELETE" })
    toast.success("Mapa removido.")
    await load()
  }

  async function syncMetaForge() {
    setSyncing(true)
    const res = await fetch("/api/admin/mapas/sync", { method: "POST" })
    setSyncing(false)
    if (res.ok) toast.success("Sync com MetaForge realizado!")
    else {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? "Erro no sync com MetaForge.")
    }
  }

  const th: React.CSSProperties = { padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", textAlign: "left" as const }
  const td: React.CSSProperties = { padding: "8px", fontSize: 12, verticalAlign: "top", borderBottom: "1px solid rgba(255,255,255,0.04)" }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>MAPAS</h1>
      </div>

      <div className="utility-panel">
        <div className="utility-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Mapas</strong><small>Dados sincronizados do banco — fallback do MetaForge</small></div>
          <button type="button" onClick={syncMetaForge} disabled={syncing}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,212,0,0.4)", background: "rgba(255,212,0,0.06)", color: "var(--yellow)", padding: "7px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit", opacity: syncing ? 0.6 : 1 }}>
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sync MetaForge"}
          </button>
        </div>

        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                {["#", "ID", "Nome", "Label", "Descrição", "Status", ""].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {maps.map(m => (
                <tr key={m.id}>
                  <td style={{ ...td, color: "var(--muted)", width: 32 }}>{m.index}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "var(--cyan)" }}>{m.id}</td>
                  <td style={td}><EditCell value={m.name} onSave={v => patchMap(m.id, { name: v })} /></td>
                  <td style={td}><EditCell value={m.label} onSave={v => patchMap(m.id, { label: v })} /></td>
                  <td style={{ ...td, maxWidth: 240 }}><EditCell value={m.description} onSave={v => patchMap(m.id, { description: v })} multiline /></td>
                  <td style={td}>
                    <select value={m.status} onChange={e => patchMap(m.id, { status: e.target.value })}
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: m.status === "ready" ? "var(--green)" : "var(--gray-500)", padding: "3px 8px", fontSize: 11, fontWeight: 950, borderRadius: 4, font: "inherit", cursor: "pointer" }}>
                      <option value="ready">ready</option>
                      <option value="pending">pending</option>
                    </select>
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <button type="button" onClick={() => setActiveMap(activeMap?.id === m.id ? null : m)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid rgba(0,217,255,0.3)", background: "rgba(0,217,255,0.05)", color: "var(--cyan)", padding: "4px 8px", fontSize: 10, fontWeight: 950, cursor: "pointer", borderRadius: 4, font: "inherit", marginRight: 6 }}>
                      <MapPin size={11} /> Marcadores
                    </button>
                    <button type="button" onClick={() => deleteMap(m.id, m.name)}
                      style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "inline-flex" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Painel de marcadores inline */}
        {activeMap && <MarkersPanel map={activeMap} onClose={() => setActiveMap(null)} />}
      </div>
    </div>
  )
}

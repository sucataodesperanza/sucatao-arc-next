"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgeCheck, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/admin-notifications"

type Streamer = {
  id: string; name: string; platform: string; channel_url: string | null
  avatar_url: string | null; viewers_text: string; verified: boolean
  active: boolean; position: number; color: string
}

const EMPTY: Omit<Streamer, "id"> = { name: "", platform: "twitch", channel_url: "", avatar_url: "", viewers_text: "", verified: false, active: true, position: 99, color: "#5fa8ff" }
const PLATFORMS = ["twitch", "youtube", "kick"]

export default function AdminStreamersPage() {
  const toast = useToast()
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [form, setForm]           = useState({ ...EMPTY })
  const [adding, setAdding]       = useState(false)
  const [saving, setSaving]       = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/streamers").then(r => r.json()).catch(() => ({ streamers: [] }))
    setStreamers(r.streamers ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  async function add() {
    if (!form.name.trim()) return toast.error("Nome é obrigatório.")
    setAdding(true)
    const res = await fetch("/api/admin/streamers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setAdding(false)
    if (res.ok) { toast.success("Streamer adicionado!"); setForm({ ...EMPTY }); await load() }
    else { const b = await res.json().catch(() => ({})); toast.error(b.error ?? "Erro ao adicionar.") }
  }

  async function update(id: string, patch: Partial<Streamer>) {
    setSaving(id)
    await fetch(`/api/admin/streamers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
    setSaving(null)
    toast.success("Salvo!")
    await load()
  }

  async function remove(id: string) {
    if (!confirm("Remover este streamer?")) return
    await fetch(`/api/admin/streamers/${id}`, { method: "DELETE" })
    toast.success("Removido.")
    await load()
  }

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "7px 10px", fontSize: 12, borderRadius: 4, font: "inherit", width: "100%" }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>STREAMERS</h1>
      </div>

      {/* Formulário novo streamer */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head"><strong>Adicionar Streamer</strong></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Nome *</span>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Patife" style={inp} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Plataforma</span>
            <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))} style={{ ...inp }}>
              {PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Viewers (texto)</span>
            <input value={form.viewers_text} onChange={e => setForm(p => ({ ...p, viewers_text: e.target.value }))} placeholder="Ex: 8.2K" style={inp} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>URL do canal</span>
            <input value={form.channel_url ?? ""} onChange={e => setForm(p => ({ ...p, channel_url: e.target.value }))} placeholder="https://twitch.tv/..." style={inp} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>URL do avatar</span>
            <input value={form.avatar_url ?? ""} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." style={inp} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Cor</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 36, height: 36, border: "1px solid var(--stroke)", borderRadius: 4, background: "none", padding: 2, cursor: "pointer" }} />
                <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ ...inp, width: "auto", flex: 1 }} />
              </div>
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Posição</span>
              <input type="number" min={1} value={form.position} onChange={e => setForm(p => ({ ...p, position: Number(e.target.value) }))} style={inp} />
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={form.verified} onChange={e => setForm(p => ({ ...p, verified: e.target.checked }))} />
            Verificado
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
            Ativo
          </label>
          <button type="button" onClick={add} disabled={adding}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            <Plus size={12} />{adding ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="utility-panel">
        <div className="utility-panel-head"><strong>{streamers.length} Streamers</strong></div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
              {["#", "Nome", "Plataforma", "Viewers", "Canal", "Verificado", "Ativo", "Cor", ""].map(h => (
                <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {streamers.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "6px 8px", width: 40 }}>
                  <input type="number" defaultValue={s.position} min={1}
                    onBlur={e => { if (Number(e.target.value) !== s.position) update(s.id, { position: Number(e.target.value) }) }}
                    style={{ width: 48, ...inp }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${s.color}`, background: `${s.color}22`, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 950, color: s.color, flexShrink: 0, overflow: "hidden" }}>
                      {s.avatar_url ? <img src={s.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : s.name[0]}
                    </div>
                    <input defaultValue={s.name} onBlur={e => { if (e.target.value !== s.name) update(s.id, { name: e.target.value }) }} style={{ ...inp, width: 120 }} />
                  </div>
                </td>
                <td style={{ padding: "6px 4px" }}>
                  <select defaultValue={s.platform} onBlur={e => { if (e.target.value !== s.platform) update(s.id, { platform: e.target.value }) }} style={{ ...inp, width: 90 }}>
                    {PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </td>
                <td style={{ padding: "6px 4px" }}>
                  <input defaultValue={s.viewers_text} onBlur={e => { if (e.target.value !== s.viewers_text) update(s.id, { viewers_text: e.target.value }) }} style={{ ...inp, width: 70 }} placeholder="8.2K" />
                </td>
                <td style={{ padding: "6px 4px" }}>
                  <input defaultValue={s.channel_url ?? ""} onBlur={e => { if (e.target.value !== (s.channel_url ?? "")) update(s.id, { channel_url: e.target.value || null }) }} style={{ ...inp, width: 160 }} placeholder="https://..." />
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={s.verified} onChange={e => update(s.id, { verified: e.target.checked })} />
                </td>
                <td style={{ padding: "6px 8px", textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={s.active} onChange={e => update(s.id, { active: e.target.checked })} />
                </td>
                <td style={{ padding: "6px 4px" }}>
                  <input type="color" defaultValue={s.color} onBlur={e => { if (e.target.value !== s.color) update(s.id, { color: e.target.value }) }} style={{ width: 36, height: 28, border: "1px solid var(--stroke)", borderRadius: 4, background: "none", padding: 2, cursor: "pointer" }} />
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }}>
                  <button type="button" onClick={() => remove(s.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {streamers.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhum streamer cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

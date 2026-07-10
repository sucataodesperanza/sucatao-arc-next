"use client"

import { useEffect, useRef, useState } from "react"
import { Trophy, Ticket, Plus, RefreshCw, Play, XCircle, Shuffle, Trash2, ImagePlus, Loader2 } from "lucide-react"

type Sorteio = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  badge: string | null
  badge_color: string
  ticket_price: number
  max_tickets: number
  tickets_sold: number
  status: string
  starts_at: string
  ends_at: string
  winner_name: string | null
  winner_ticket: number | null
  drawn_at: string | null
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  upcoming:  "Em Breve",
  active:    "Ativo",
  finished:  "Finalizado",
  cancelled: "Cancelado",
}
const STATUS_COLOR: Record<string, string> = {
  upcoming:  "var(--yellow)",
  active:    "var(--green)",
  finished:  "var(--purple)",
  cancelled: "var(--gray-500)",
}
const BADGE_COLOR_OPTIONS = [
  { value: "purple", label: "Roxo" },
  { value: "yellow", label: "Dourado" },
  { value: "cyan",   label: "Ciano" },
  { value: "red",    label: "Vermelho" },
  { value: "green",  label: "Verde" },
]

const EMPTY_FORM = {
  title: "", description: "", image_url: "", badge: "", badge_color: "purple",
  ticket_price: 10, max_tickets: 1000,
  starts_at: "", ends_at: "",
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

const card: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "20px 24px" }
const inp: React.CSSProperties = { background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, color: "var(--paper)", padding: "6px 10px", fontSize: 12, width: "100%" }
const sel: React.CSSProperties = { ...inp, cursor: "pointer" }
const btn = (color = "var(--yellow)"): React.CSSProperties => ({ background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, color, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 950, cursor: "pointer", fontFamily: "inherit" })

export default function AdminSorteiosPage() {
  const [sorteios, setSorteios]   = useState<Sorteio[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState("")
  const [acting, setActing]       = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function load() {
    setLoading(true)
    fetch("/api/admin/sorteios").then(r => r.json()).then(d => {
      setSorteios(d.sorteios ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleImageFile(file: File) {
    setUploading(true)
    setFormError("")
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok) { setFormError(data.error ?? "Erro no upload."); return }
    setForm(p => ({ ...p, image_url: data.url }))
  }

  async function create() {
    setFormError("")
    if (!form.title.trim()) { setFormError("Título é obrigatório."); return }
    if (!form.starts_at || !form.ends_at) { setFormError("Datas de início e fim são obrigatórias."); return }
    if (!form.ticket_price || !form.max_tickets) { setFormError("Preço e máximo de tickets são obrigatórios."); return }
    setSaving(true)
    const res = await fetch("/api/admin/sorteios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setFormError(data.error ?? "Erro ao criar sorteio."); return }
    setForm(EMPTY_FORM)
    load()
  }

  async function action(id: string, act: string) {
    setActing(id + act)
    await fetch(`/api/admin/sorteios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act }),
    })
    setActing(null)
    load()
  }

  async function del(id: string) {
    if (!confirm("Excluir este sorteio? Esta ação não pode ser desfeita.")) return
    setActing(id + "delete")
    await fetch(`/api/admin/sorteios/${id}`, { method: "DELETE" })
    setActing(null)
    load()
  }

  const stats = {
    total:    sorteios.length,
    active:   sorteios.filter(s => s.status === "active").length,
    finished: sorteios.filter(s => s.status === "finished").length,
    tickets:  sorteios.reduce((sum, s) => sum + s.tickets_sold, 0),
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 950, color: "var(--paper)" }}>Sorteios</h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {[
          { label: "Total",     value: stats.total,    icon: Trophy,     color: "var(--cyan)"   },
          { label: "Ativos",    value: stats.active,   icon: Play,       color: "var(--green)"  },
          { label: "Finalizados", value: stats.finished, icon: Shuffle,  color: "var(--purple)" },
          { label: "Tickets Vendidos", value: stats.tickets, icon: Ticket, color: "var(--yellow)" },
        ].map(s => (
          <div key={s.label} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
            <s.icon size={22} style={{ color: s.color, flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: 22, fontWeight: 950, color: "var(--paper)" }}>{s.value.toLocaleString("pt-BR")}</strong>
              <p style={{ margin: 0, fontSize: 11, color: "var(--gray-500)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulário novo sorteio */}
      <div style={card}>
        <p style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 950, color: "var(--paper)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Novo Sorteio</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Título *</label>
            <input style={inp} placeholder="Ex: Drone ARC-07" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Descrição</label>
            <input style={inp} placeholder="Descrição breve" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Imagem</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
            {form.image_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-3)", border: "1px solid var(--stroke)", borderRadius: 6, padding: "6px 10px" }}>
                <img src={form.image_url} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
                <span style={{ fontSize: 12, color: "var(--paper)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Imagem selecionada</span>
                <button type="button" onClick={() => { setForm(p => ({ ...p, image_url: "" })); if (fileRef.current) fileRef.current.value = "" }} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--surface-3)", border: "1px dashed var(--stroke)", borderRadius: 6, padding: "10px", cursor: "pointer", color: uploading ? "var(--cyan)" : "var(--gray-500)", fontSize: 12, fontFamily: "inherit", transition: "border-color 0.15s, color 0.15s" }}
              >
                {uploading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ImagePlus size={14} />}
                {uploading ? "Enviando..." : "Clique para anexar imagem"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Badge (texto)</label>
              <input style={inp} placeholder="EXCLUSIVO" value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 120 }}>
              <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cor do Badge</label>
              <select style={sel} value={form.badge_color} onChange={e => setForm(p => ({ ...p, badge_color: e.target.value }))}>
                {BADGE_COLOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Preço do Ticket (pontos) *</label>
            <input style={inp} type="number" min={1} placeholder="10" value={form.ticket_price} onChange={e => setForm(p => ({ ...p, ticket_price: Number(e.target.value) }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Máx. de Tickets *</label>
            <input style={inp} type="number" min={1} placeholder="1000" value={form.max_tickets} onChange={e => setForm(p => ({ ...p, max_tickets: Number(e.target.value) }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Início *</label>
            <input style={inp} type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--gray-500)", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.05em" }}>Encerramento *</label>
            <input style={inp} type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <button type="button" disabled={saving} onClick={create} style={{ ...btn("var(--yellow)"), padding: "8px 20px", fontSize: 12, flex: 1 }}>
              <Plus size={13} style={{ display: "inline", marginRight: 4 }} />{saving ? "Criando..." : "Criar Sorteio"}
            </button>
            <button type="button" onClick={() => setForm(EMPTY_FORM)} style={{ ...btn("var(--gray-500)"), padding: "8px 14px", fontSize: 12 }}>Limpar</button>
          </div>
        </div>
        {formError && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--red)" }}>{formError}</p>}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 950, color: "var(--paper)" }}>{sorteios.length} sorteio(s) cadastrado(s)</span>
        <button type="button" onClick={load} style={btn()} disabled={loading}>
          <RefreshCw size={11} style={{ display: "inline", marginRight: 4 }} />{loading ? "..." : "Atualizar"}
        </button>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                {["Sorteio", "Preço", "Tickets", "Período", "Status", "Vencedor", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--gray-500)", fontWeight: 950, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Carregando...</td></tr>
              ) : sorteios.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray-500)", textAlign: "center" }}>Nenhum sorteio cadastrado.</td></tr>
              ) : sorteios.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < sorteios.length - 1 ? "1px solid var(--stroke)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 700, color: "var(--paper)" }}>{s.title}</div>
                    {s.badge && <div style={{ fontSize: 10, color: "var(--gray-500)", marginTop: 2 }}>{s.badge}</div>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--cyan)", fontWeight: 950 }}>{s.ticket_price} pts</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 950, color: "var(--paper)" }}>{s.tickets_sold} / {s.max_tickets}</div>
                    <div style={{ height: 3, background: "var(--stroke)", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(s.tickets_sold / s.max_tickets * 100)}%`, background: "var(--cyan)", borderRadius: 99 }} />
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--gray-500)" }}>
                    <div style={{ fontSize: 11 }}>{fmtDate(s.starts_at)}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>→ {fmtDate(s.ends_at)}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, padding: "3px 8px", borderRadius: 4, background: `color-mix(in srgb, ${STATUS_COLOR[s.status] ?? "var(--gray-500)"} 12%, transparent)`, color: STATUS_COLOR[s.status] ?? "var(--gray-500)", border: `1px solid color-mix(in srgb, ${STATUS_COLOR[s.status] ?? "var(--gray-500)"} 25%, transparent)` }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--paper)" }}>
                    {s.winner_name ? (
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.winner_name}</div>
                        <div style={{ fontSize: 10, color: "var(--gray-500)" }}>Ticket #{s.winner_ticket}</div>
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {s.status === "upcoming" && (
                        <button type="button" disabled={acting === s.id + "activate"} onClick={() => action(s.id, "activate")} style={btn("var(--green)")}>
                          <Play size={10} style={{ display: "inline", marginRight: 3 }} />Ativar
                        </button>
                      )}
                      {s.status === "active" && (
                        <button type="button" disabled={acting === s.id + "draw"} onClick={() => action(s.id, "draw")} style={btn("var(--purple)")}>
                          <Shuffle size={10} style={{ display: "inline", marginRight: 3 }} />Sortear
                        </button>
                      )}
                      {(s.status === "upcoming" || s.status === "active") && (
                        <button type="button" disabled={acting === s.id + "cancel"} onClick={() => action(s.id, "cancel")} style={btn("var(--red)")}>
                          <XCircle size={10} style={{ display: "inline", marginRight: 3 }} />Cancelar
                        </button>
                      )}
                      {s.status === "cancelled" && (
                        <button type="button" disabled={acting === s.id + "delete"} onClick={() => del(s.id)} style={btn("var(--gray-500)")}>
                          <Trash2 size={10} style={{ display: "inline", marginRight: 3 }} />Excluir
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

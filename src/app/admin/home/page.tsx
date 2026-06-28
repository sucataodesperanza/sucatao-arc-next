"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2, Upload, GripVertical } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

// Ícones disponíveis (subconjunto relevante do Lucide)
const ICON_OPTIONS = [
  "Megaphone","TrendingUp","Sparkles","ArrowLeftRight","Flag","ScrollText",
  "Star","Trophy","Zap","Shield","Sword","Package","Gift","Bell","Rocket",
  "Medal","Award","Target","CheckCircle","AlertTriangle","Info","Bookmark",
]

type News  = { id: string; date_label: string; title: string; text: string; image_url: string | null; href: string | null; icon_name: string; active: boolean; position: number }
type Slide = { id: string; tag: string; icon_name: string; image_url: string | null; title: string; text: string; cta_label: string; cta_href: string; active: boolean; position: number }

function ImageField({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
        {value ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Upload size={14} style={{ color: "var(--gray-500)" }} />}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
          onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return
            setUploading(true)
            const fd = new FormData(); fd.append("file", file); fd.append("name", name)
            const res = await fetch("/api/admin/home/upload", { method: "POST", body: fd })
            setUploading(false)
            if (res.ok) { const { url } = await res.json(); onChange(url) }
            else toast.error("Erro ao enviar imagem.")
          }} />
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "4px 8px", borderRadius: 4, cursor: "pointer", font: "inherit", opacity: uploading ? 0.6 : 1 }}>
          {uploading ? "Enviando..." : "Upload"}
        </button>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="ou cole uma URL"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "3px 7px", fontSize: 10, borderRadius: 4, font: "inherit" }} />
      </div>
    </div>
  )
}

function IconSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "6px 8px", fontSize: 12, borderRadius: 4, font: "inherit", width: "100%" }}>
      {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
    </select>
  )
}

const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "7px 10px", fontSize: 12, borderRadius: 4, font: "inherit", width: "100%" }
const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 3 }

export default function AdminHomePage() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [news, setNews]     = useState<News[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)

  // Formulários de criação
  const [newNewsForm, setNewNewsForm] = useState({ date_label: "", title: "", text: "", image_url: "", href: "", icon_name: "Megaphone" })
  const [newSlideForm, setNewSlideForm] = useState({ tag: "", icon_name: "Sparkles", image_url: "", title: "", text: "", cta_label: "Saiba mais", cta_href: "/" })
  const [savingNews, setSavingNews]   = useState(false)
  const [savingSlide, setSavingSlide] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/home")
    const body = await res.json().catch(() => ({}))
    setNews(body.news ?? [])
    setSlides(body.slides ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function patch(table: string, id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/home/${table}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
    await load()
  }

  async function del(table: string, id: string, label: string) {
    const ok = await confirm(`Remover "${label}"?`)
    if (!ok) return
    await fetch(`/api/admin/home/${table}/${id}`, { method: "DELETE" })
    await load()
  }

  async function createNews() {
    if (!newNewsForm.title) return toast.error("Título obrigatório.")
    setSavingNews(true)
    const res = await fetch("/api/admin/home", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "news", ...newNewsForm, image_url: newNewsForm.image_url || null, href: newNewsForm.href || null }) })
    setSavingNews(false)
    if (res.ok) { toast.success("Nota criada!"); setNewNewsForm({ date_label: "", title: "", text: "", image_url: "", href: "", icon_name: "Megaphone" }); await load() }
    else toast.error("Erro ao criar nota.")
  }

  async function createSlide() {
    if (!newSlideForm.title) return toast.error("Título obrigatório.")
    setSavingSlide(true)
    const res = await fetch("/api/admin/home", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "slide", ...newSlideForm, image_url: newSlideForm.image_url || null }) })
    setSavingSlide(false)
    if (res.ok) { toast.success("Novidade criada!"); setNewSlideForm({ tag: "", icon_name: "Sparkles", image_url: "", title: "", text: "", cta_label: "Saiba mais", cta_href: "/" }); await load() }
    else toast.error("Erro ao criar novidade.")
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>TELA INICIAL</h1>
      </div>

      {/* ── Notas de Atualização ── */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head"><strong>Notas de Atualização</strong><small>Cards "Notas de atualização mais recentes" na tela inicial</small></div>

        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {news.map(n => (
              <div key={n.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={lbl}>Data</span><input defaultValue={n.date_label} onBlur={e => patch("home_news", n.id, { date_label: e.target.value })} style={inp} /></label>
                  <label><span style={lbl}>Título</span><input defaultValue={n.title} onBlur={e => patch("home_news", n.id, { title: e.target.value })} style={inp} /></label>
                  <label><span style={lbl}>Link (opcional)</span><input defaultValue={n.href ?? ""} onBlur={e => patch("home_news", n.id, { href: e.target.value || null })} style={inp} placeholder="/rankings" /></label>
                </div>
                <label><span style={lbl}>Texto</span><textarea defaultValue={n.text} rows={2} onBlur={e => patch("home_news", n.id, { text: e.target.value })} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px auto auto", gap: 10, alignItems: "end" }}>
                  <div><span style={lbl}>Imagem</span><ImageField value={n.image_url ?? ""} onChange={v => patch("home_news", n.id, { image_url: v || null })} name={`news-${n.id}`} /></div>
                  <label><span style={lbl}>Ícone</span><IconSelect value={n.icon_name} onChange={v => patch("home_news", n.id, { icon_name: v })} /></label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, alignSelf: "end" }}><span style={lbl}>Ativo</span><input type="checkbox" checked={n.active} onChange={e => patch("home_news", n.id, { active: e.target.checked })} /></label>
                  <button type="button" onClick={() => del("home_news", n.id, n.title)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", alignSelf: "end", padding: 6 }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Criar nova nota */}
        <details style={{ border: "1px dashed var(--stroke)", borderRadius: 8, padding: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", letterSpacing: "0.05em" }}><Plus size={12} style={{ marginRight: 6 }} />Nova Nota de Atualização</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label><span style={lbl}>Data</span><input value={newNewsForm.date_label} onChange={e => setNewNewsForm(p => ({ ...p, date_label: e.target.value }))} placeholder="11 DE JUNHO DE 2026" style={inp} /></label>
              <label><span style={lbl}>Título *</span><input value={newNewsForm.title} onChange={e => setNewNewsForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>Link (opcional)</span><input value={newNewsForm.href} onChange={e => setNewNewsForm(p => ({ ...p, href: e.target.value }))} placeholder="/rankings" style={inp} /></label>
            </div>
            <label><span style={lbl}>Texto</span><textarea value={newNewsForm.text} onChange={e => setNewNewsForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10 }}>
              <div><span style={lbl}>Imagem</span><ImageField value={newNewsForm.image_url} onChange={v => setNewNewsForm(p => ({ ...p, image_url: v }))} name={`new-news-${Date.now()}`} /></div>
              <label><span style={lbl}>Ícone</span><IconSelect value={newNewsForm.icon_name} onChange={v => setNewNewsForm(p => ({ ...p, icon_name: v }))} /></label>
            </div>
            <button type="button" onClick={createNews} disabled={savingNews || !newNewsForm.title}
              style={{ alignSelf: "start", border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "9px 20px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit" }}>
              {savingNews ? "Criando..." : "✓ Criar Nota"}
            </button>
          </div>
        </details>
      </div>

      {/* ── Novidades (slides) ── */}
      <div className="utility-panel">
        <div className="utility-panel-head"><strong>Novidades</strong><small>Slides do carrossel "Novidades" na tela inicial</small></div>

        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {slides.map(s => (
              <div key={s.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={lbl}>Tag</span><input defaultValue={s.tag} onBlur={e => patch("home_slides", s.id, { tag: e.target.value })} style={inp} /></label>
                  <label><span style={lbl}>Título</span><input defaultValue={s.title} onBlur={e => patch("home_slides", s.id, { title: e.target.value })} style={inp} /></label>
                  <label><span style={lbl}>CTA Label</span><input defaultValue={s.cta_label} onBlur={e => patch("home_slides", s.id, { cta_label: e.target.value })} style={inp} /></label>
                  <label><span style={lbl}>CTA Link</span><input defaultValue={s.cta_href} onBlur={e => patch("home_slides", s.id, { cta_href: e.target.value })} style={inp} /></label>
                </div>
                <label><span style={lbl}>Texto</span><textarea defaultValue={s.text} rows={2} onBlur={e => patch("home_slides", s.id, { text: e.target.value })} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px auto auto", gap: 10, alignItems: "end" }}>
                  <div><span style={lbl}>Imagem de fundo</span><ImageField value={s.image_url ?? ""} onChange={v => patch("home_slides", s.id, { image_url: v || null })} name={`slide-${s.id}`} /></div>
                  <label><span style={lbl}>Ícone</span><IconSelect value={s.icon_name} onChange={v => patch("home_slides", s.id, { icon_name: v })} /></label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 3, alignSelf: "end" }}><span style={lbl}>Ativo</span><input type="checkbox" checked={s.active} onChange={e => patch("home_slides", s.id, { active: e.target.checked })} /></label>
                  <button type="button" onClick={() => del("home_slides", s.id, s.title)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", alignSelf: "end", padding: 6 }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Criar novo slide */}
        <details style={{ border: "1px dashed var(--stroke)", borderRadius: 8, padding: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", letterSpacing: "0.05em" }}><Plus size={12} style={{ marginRight: 6 }} />Nova Novidade (Slide)</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <label><span style={lbl}>Tag</span><input value={newSlideForm.tag} onChange={e => setNewSlideForm(p => ({ ...p, tag: e.target.value }))} placeholder="Atualizações" style={inp} /></label>
              <label><span style={lbl}>Título *</span><input value={newSlideForm.title} onChange={e => setNewSlideForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>CTA Label</span><input value={newSlideForm.cta_label} onChange={e => setNewSlideForm(p => ({ ...p, cta_label: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>CTA Link</span><input value={newSlideForm.cta_href} onChange={e => setNewSlideForm(p => ({ ...p, cta_href: e.target.value }))} style={inp} /></label>
            </div>
            <label><span style={lbl}>Texto</span><textarea value={newSlideForm.text} onChange={e => setNewSlideForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10 }}>
              <div><span style={lbl}>Imagem de fundo</span><ImageField value={newSlideForm.image_url} onChange={v => setNewSlideForm(p => ({ ...p, image_url: v }))} name={`new-slide-${Date.now()}`} /></div>
              <label><span style={lbl}>Ícone</span><IconSelect value={newSlideForm.icon_name} onChange={v => setNewSlideForm(p => ({ ...p, icon_name: v }))} /></label>
            </div>
            <button type="button" onClick={createSlide} disabled={savingSlide || !newSlideForm.title}
              style={{ alignSelf: "start", border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "9px 20px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit" }}>
              {savingSlide ? "Criando..." : "✓ Criar Novidade"}
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

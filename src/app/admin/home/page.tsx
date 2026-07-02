"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle, ArrowLeftRight, Award, Bell, Bookmark, CheckCircle,
  ChevronRight, Flag, Gift, Info, Medal, Megaphone, Package, Plus, Rocket,
  ScrollText, Shield, Sparkles, Star, Sword, Target, Trash2, TrendingUp,
  Trophy, Upload, X, Zap,
  type LucideIcon,
} from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

const ICON_OPTIONS = [
  "Megaphone","TrendingUp","Sparkles","ArrowLeftRight","Flag","ScrollText",
  "Star","Trophy","Zap","Shield","Sword","Package","Gift","Bell","Rocket",
  "Medal","Award","Target","CheckCircle","AlertTriangle","Info","Bookmark",
] as const

type IconName = typeof ICON_OPTIONS[number]

const ICON_MAP: Record<IconName, LucideIcon> = {
  Megaphone, TrendingUp, Sparkles, ArrowLeftRight, Flag, ScrollText,
  Star, Trophy, Zap, Shield, Sword, Package, Gift, Bell, Rocket,
  Medal, Award, Target, CheckCircle, AlertTriangle, Info, Bookmark,
}

type News  = { id: string; date_label: string; title: string; text: string; image_url: string | null; href: string | null; icon_name: string; active: boolean; position: number }
type Slide = { id: string; tag: string; icon_name: string; image_url: string | null; title: string; text: string; cta_label: string; cta_href: string; active: boolean; position: number }

type NewsForm  = { date_label: string; title: string; text: string; image_url: string; href: string; icon_name: string; active: boolean }
type SlideForm = { tag: string; icon_name: string; image_url: string; title: string; text: string; cta_label: string; cta_href: string; active: boolean }

const inp: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)",
  padding: "7px 10px", fontSize: 12, borderRadius: 6, font: "inherit", width: "100%", outline: "none",
}
const lbl: React.CSSProperties = {
  fontSize: 10, fontWeight: 950, textTransform: "uppercase",
  color: "var(--gray-500)", display: "block", marginBottom: 4,
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      title={checked ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
        background: checked ? "rgba(61,242,139,0.75)" : "rgba(255,255,255,0.12)",
        position: "relative", transition: "background 0.2s", padding: 0, flexShrink: 0,
      }}
    >
      <span style={{
        display: "block", width: 14, height: 14, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        position: "absolute", top: 3, left: checked ? 19 : 3, transition: "left 0.2s",
      }} />
    </button>
  )
}

function ImageField({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
        {value
          ? <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <Upload size={14} style={{ color: "var(--gray-500)" }} />}
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
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="ou cole uma URL" style={inp} />
      </div>
    </div>
  )
}

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const Icon = ICON_MAP[value as IconName] ?? Megaphone

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...inp, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}
      >
        <Icon size={14} style={{ flexShrink: 0, color: "var(--cyan)" }} />
        <span style={{ flex: 1 }}>{value}</span>
        <ChevronRight size={12} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1100, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "#04090e", border: "1px solid var(--stroke)", borderRadius: 14, padding: 20, width: 420, maxHeight: "70vh", display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gray-500)" }}>Escolher ícone</span>
              <button type="button" onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
              {ICON_OPTIONS.map(name => {
                const Ic = ICON_MAP[name]
                const selected = name === value
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false) }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
                      padding: "12px 6px", borderRadius: 8, cursor: "pointer", transition: "background 0.1s, border-color 0.1s",
                      border: selected ? "1px solid rgba(0,217,255,0.5)" : "1px solid transparent",
                      background: selected ? "rgba(0,217,255,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Ic size={20} style={{ color: selected ? "var(--cyan)" : "var(--paper-dim)" }} />
                    <span style={{ fontSize: 9, fontWeight: 850, textTransform: "uppercase", color: selected ? "var(--cyan)" : "var(--gray-500)", textAlign: "center", lineHeight: 1.3, letterSpacing: "0.02em" }}>
                      {name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EditModal({ image, title, onClose, onSave, saving, children }: {
  image: string | null; title: string
  onClose: () => void; onSave: () => void; saving: boolean
  children: React.ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(2px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#04090e", border: "1px solid var(--stroke)", borderRadius: 14, width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--stroke)", flexShrink: 0 }}>
          {image
            ? <img src={image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
          <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 950, color: "var(--paper)" }}>{title}</p>
          <button type="button" onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, display: "flex", borderRadius: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: 20, display: "grid", gap: 10, flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--stroke)", flexShrink: 0 }}>
          <button type="button" onClick={onClose}
            style={{ border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit" }}>
            Cancelar
          </button>
          <button type="button" onClick={onSave} disabled={saving}
            style={{ border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "8px 20px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvando..." : "✓ Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateForm({ onCancel, onSubmit, saving, children }: {
  onCancel: () => void; onSubmit: () => void; saving: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ border: "1px solid rgba(0,217,255,0.2)", borderRadius: 8, padding: 16, marginBottom: 12, background: "rgba(0,217,255,0.025)" }}>
      <div style={{ display: "grid", gap: 10 }}>
        {children}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onCancel}
            style={{ border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit" }}>
            Cancelar
          </button>
          <button type="button" onClick={onSubmit} disabled={saving}
            style={{ border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "8px 20px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Criando..." : "✓ Criar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ image, title, sub, active, onToggle, onDelete, onClick }: {
  image: string | null; title: string; sub?: string; active: boolean
  onToggle: (v: boolean) => void; onDelete: () => void; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {image
        ? <img src={image} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: 32, height: 32, borderRadius: 5, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 950, color: "var(--paper)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        {sub && <p style={{ margin: 0, fontSize: 10, color: "var(--gray-500)", fontWeight: 800, textTransform: "uppercase" }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <ToggleSwitch checked={active} onChange={onToggle} />
        <button type="button" onClick={onDelete}
          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex", opacity: 0.5, transition: "opacity 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function AdminHomePage() {
  const toast    = useToast()
  const { confirm } = useConfirm()
  const [news, setNews]       = useState<News[]>([])
  const [slides, setSlides]   = useState<Slide[]>([])
  const [loading, setLoading] = useState(true)

  // Formulários de criação
  const [showNewsForm, setShowNewsForm]   = useState(false)
  const [showSlideForm, setShowSlideForm] = useState(false)
  const [newNewsForm, setNewNewsForm]   = useState<NewsForm>({ date_label: "", title: "", text: "", image_url: "", href: "", icon_name: "Megaphone", active: true })
  const [newSlideForm, setNewSlideForm] = useState<SlideForm>({ tag: "", icon_name: "Sparkles", image_url: "", title: "", text: "", cta_label: "Saiba mais", cta_href: "/", active: true })
  const [savingNews, setSavingNews]   = useState(false)
  const [savingSlide, setSavingSlide] = useState(false)

  // Modais de edição
  const [editingNews, setEditingNews]   = useState<News | null>(null)
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null)
  const [newsEditForm, setNewsEditForm]   = useState<NewsForm>({ date_label: "", title: "", text: "", image_url: "", href: "", icon_name: "Megaphone", active: true })
  const [slideEditForm, setSlideEditForm] = useState<SlideForm>({ tag: "", icon_name: "Sparkles", image_url: "", title: "", text: "", cta_label: "", cta_href: "/", active: true })
  const [savingEdit, setSavingEdit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const body = await fetch("/api/admin/home").then(r => r.json()).catch(() => ({}))
    setNews(body.news ?? [])
    setSlides(body.slides ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function quickPatch(table: string, id: string, data: Record<string, unknown>) {
    await fetch(`/api/admin/home/${table}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    await load()
  }

  async function del(table: string, id: string, label: string) {
    if (!await confirm(`Remover "${label}"?`)) return
    await fetch(`/api/admin/home/${table}/${id}`, { method: "DELETE" })
    await load()
  }

  // ── Criação ──────────────────────────────────────────────────────────────

  async function createNews() {
    if (!newNewsForm.title) return toast.error("Título obrigatório.")
    setSavingNews(true)
    const res = await fetch("/api/admin/home", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "news", ...newNewsForm, image_url: newNewsForm.image_url || null, href: newNewsForm.href || null }),
    })
    setSavingNews(false)
    if (res.ok) {
      toast.success("Nota criada!")
      setNewNewsForm({ date_label: "", title: "", text: "", image_url: "", href: "", icon_name: "Megaphone", active: true })
      setShowNewsForm(false)
      await load()
    } else {
      const b = await res.json().catch(() => ({}))
      toast.error(`Erro: ${b.error ?? res.status}`)
    }
  }

  async function createSlide() {
    if (!newSlideForm.title) return toast.error("Título obrigatório.")
    setSavingSlide(true)
    const res = await fetch("/api/admin/home", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "slide", ...newSlideForm, image_url: newSlideForm.image_url || null }),
    })
    setSavingSlide(false)
    if (res.ok) {
      toast.success("Novidade criada!")
      setNewSlideForm({ tag: "", icon_name: "Sparkles", image_url: "", title: "", text: "", cta_label: "Saiba mais", cta_href: "/", active: true })
      setShowSlideForm(false)
      await load()
    } else {
      toast.error("Erro ao criar novidade.")
    }
  }

  // ── Edição via modal ──────────────────────────────────────────────────────

  function openNewsEdit(n: News) {
    setNewsEditForm({ date_label: n.date_label, title: n.title, text: n.text, image_url: n.image_url ?? "", href: n.href ?? "", icon_name: n.icon_name, active: n.active })
    setEditingNews(n)
  }

  function openSlideEdit(s: Slide) {
    setSlideEditForm({ tag: s.tag, icon_name: s.icon_name, image_url: s.image_url ?? "", title: s.title, text: s.text, cta_label: s.cta_label, cta_href: s.cta_href, active: s.active })
    setEditingSlide(s)
  }

  async function saveNewsEdit() {
    if (!editingNews) return
    setSavingEdit(true)
    await fetch(`/api/admin/home/home_news/${editingNews.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newsEditForm, image_url: newsEditForm.image_url || null, href: newsEditForm.href || null }),
    })
    setSavingEdit(false)
    setEditingNews(null)
    toast.success("Nota salva!")
    await load()
  }

  async function saveSlideEdit() {
    if (!editingSlide) return
    setSavingEdit(true)
    await fetch(`/api/admin/home/home_slides/${editingSlide.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...slideEditForm, image_url: slideEditForm.image_url || null }),
    })
    setSavingEdit(false)
    setEditingSlide(null)
    toast.success("Novidade salva!")
    await load()
  }

  // ─────────────────────────────────────────────────────────────────────────

  const sectionBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: "1px solid rgba(0,217,255,0.35)", background: "rgba(0,217,255,0.07)", color: "var(--cyan)",
    padding: "7px 14px", fontSize: 11, fontWeight: 950, textTransform: "uppercase",
    cursor: "pointer", borderRadius: 6, font: "inherit",
  }

  return (
    <div>
      {/* ── Notas de Atualização ── */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head">
          <div>
            <strong>Notas de Atualização</strong>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--gray-500)", fontWeight: 600 }}>
              Cards na seção "Mais recentes" da tela inicial
            </p>
          </div>
          <button type="button" style={sectionBtn} onClick={() => setShowNewsForm(v => !v)}>
            <Plus size={13} /> Nova nota
          </button>
        </div>

        {showNewsForm && (
          <CreateForm onCancel={() => setShowNewsForm(false)} onSubmit={createNews} saving={savingNews}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <label><span style={lbl}>Data</span><input value={newNewsForm.date_label} onChange={e => setNewNewsForm(p => ({ ...p, date_label: e.target.value }))} placeholder="11 DE JUNHO DE 2026" style={inp} /></label>
              <label><span style={lbl}>Título *</span><input value={newNewsForm.title} onChange={e => setNewNewsForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>Link (opcional)</span><input value={newNewsForm.href} onChange={e => setNewNewsForm(p => ({ ...p, href: e.target.value }))} placeholder="/rankings" style={inp} /></label>
            </div>
            <label><span style={lbl}>Texto</span><textarea value={newNewsForm.text} onChange={e => setNewNewsForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
              <div><span style={lbl}>Imagem</span><ImageField value={newNewsForm.image_url} onChange={v => setNewNewsForm(p => ({ ...p, image_url: v }))} name="new-news" /></div>
              <label><span style={lbl}>Ícone</span><IconPicker value={newNewsForm.icon_name} onChange={v => setNewNewsForm(p => ({ ...p, icon_name: v }))} /></label>
            </div>
          </CreateForm>
        )}

        {loading ? (
          <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Carregando...</p>
        ) : news.length === 0 && !showNewsForm ? (
          <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Nenhuma nota cadastrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {news.map(n => (
              <div key={n.id} style={{ border: "1px solid var(--stroke)", borderRadius: 8, overflow: "hidden" }}>
                <ItemRow
                  image={n.image_url} title={n.title} sub={n.date_label}
                  active={n.active} onToggle={v => quickPatch("home_news", n.id, { active: v })}
                  onDelete={() => del("home_news", n.id, n.title)}
                  onClick={() => openNewsEdit(n)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Novidades (slides) ── */}
      <div className="utility-panel">
        <div className="utility-panel-head">
          <div>
            <strong>Novidades</strong>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--gray-500)", fontWeight: 600 }}>
              Slides do carrossel "Novidades" na tela inicial
            </p>
          </div>
          <button type="button" style={sectionBtn} onClick={() => setShowSlideForm(v => !v)}>
            <Plus size={13} /> Nova novidade
          </button>
        </div>

        {showSlideForm && (
          <CreateForm onCancel={() => setShowSlideForm(false)} onSubmit={createSlide} saving={savingSlide}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              <label><span style={lbl}>Tag</span><input value={newSlideForm.tag} onChange={e => setNewSlideForm(p => ({ ...p, tag: e.target.value }))} placeholder="Atualizações" style={inp} /></label>
              <label><span style={lbl}>Título *</span><input value={newSlideForm.title} onChange={e => setNewSlideForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>CTA Label</span><input value={newSlideForm.cta_label} onChange={e => setNewSlideForm(p => ({ ...p, cta_label: e.target.value }))} style={inp} /></label>
              <label><span style={lbl}>CTA Link</span><input value={newSlideForm.cta_href} onChange={e => setNewSlideForm(p => ({ ...p, cta_href: e.target.value }))} style={inp} /></label>
            </div>
            <label><span style={lbl}>Texto</span><textarea value={newSlideForm.text} onChange={e => setNewSlideForm(p => ({ ...p, text: e.target.value }))} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
              <div><span style={lbl}>Imagem de fundo</span><ImageField value={newSlideForm.image_url} onChange={v => setNewSlideForm(p => ({ ...p, image_url: v }))} name="new-slide" /></div>
              <label><span style={lbl}>Ícone</span><IconPicker value={newSlideForm.icon_name} onChange={v => setNewSlideForm(p => ({ ...p, icon_name: v }))} /></label>
            </div>
          </CreateForm>
        )}

        {loading ? (
          <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Carregando...</p>
        ) : slides.length === 0 && !showSlideForm ? (
          <p style={{ color: "var(--gray-500)", fontSize: 13 }}>Nenhuma novidade cadastrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {slides.map(s => (
              <div key={s.id} style={{ border: "1px solid var(--stroke)", borderRadius: 8, overflow: "hidden" }}>
                <ItemRow
                  image={s.image_url} title={s.title} sub={s.tag}
                  active={s.active} onToggle={v => quickPatch("home_slides", s.id, { active: v })}
                  onDelete={() => del("home_slides", s.id, s.title)}
                  onClick={() => openSlideEdit(s)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal editar Nota ── */}
      {editingNews && (
        <EditModal
          image={newsEditForm.image_url || null}
          title={newsEditForm.title || editingNews.title}
          onClose={() => setEditingNews(null)}
          onSave={saveNewsEdit}
          saving={savingEdit}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Título</span><input value={newsEditForm.title} onChange={e => setNewsEditForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
            <label><span style={lbl}>Data</span><input value={newsEditForm.date_label} onChange={e => setNewsEditForm(p => ({ ...p, date_label: e.target.value }))} placeholder="11 DE JUNHO DE 2026" style={inp} /></label>
          </div>
          <label><span style={lbl}>Link (opcional)</span><input value={newsEditForm.href} onChange={e => setNewsEditForm(p => ({ ...p, href: e.target.value }))} placeholder="/rankings" style={inp} /></label>
          <label><span style={lbl}>Texto</span><textarea value={newsEditForm.text} onChange={e => setNewsEditForm(p => ({ ...p, text: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
            <div><span style={lbl}>Imagem</span><ImageField value={newsEditForm.image_url} onChange={v => setNewsEditForm(p => ({ ...p, image_url: v }))} name={`news-edit-${editingNews.id}`} /></div>
            <div><span style={lbl}>Ícone</span><IconPicker value={newsEditForm.icon_name} onChange={v => setNewsEditForm(p => ({ ...p, icon_name: v }))} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ToggleSwitch checked={newsEditForm.active} onChange={v => setNewsEditForm(p => ({ ...p, active: v }))} />
            <span style={{ fontSize: 12, color: newsEditForm.active ? "var(--green)" : "var(--gray-500)" }}>
              {newsEditForm.active ? "Ativo" : "Inativo"}
            </span>
          </div>
        </EditModal>
      )}

      {/* ── Modal editar Novidade ── */}
      {editingSlide && (
        <EditModal
          image={slideEditForm.image_url || null}
          title={slideEditForm.title || editingSlide.title}
          onClose={() => setEditingSlide(null)}
          onSave={saveSlideEdit}
          saving={savingEdit}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Título</span><input value={slideEditForm.title} onChange={e => setSlideEditForm(p => ({ ...p, title: e.target.value }))} style={inp} /></label>
            <label><span style={lbl}>Tag</span><input value={slideEditForm.tag} onChange={e => setSlideEditForm(p => ({ ...p, tag: e.target.value }))} placeholder="Atualizações" style={inp} /></label>
          </div>
          <label><span style={lbl}>Texto</span><textarea value={slideEditForm.text} onChange={e => setSlideEditForm(p => ({ ...p, text: e.target.value }))} rows={3} style={{ ...inp, resize: "vertical" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>CTA Label</span><input value={slideEditForm.cta_label} onChange={e => setSlideEditForm(p => ({ ...p, cta_label: e.target.value }))} style={inp} /></label>
            <label><span style={lbl}>CTA Link</span><input value={slideEditForm.cta_href} onChange={e => setSlideEditForm(p => ({ ...p, cta_href: e.target.value }))} style={inp} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 10 }}>
            <div><span style={lbl}>Imagem de fundo</span><ImageField value={slideEditForm.image_url} onChange={v => setSlideEditForm(p => ({ ...p, image_url: v }))} name={`slide-edit-${editingSlide.id}`} /></div>
            <div><span style={lbl}>Ícone</span><IconPicker value={slideEditForm.icon_name} onChange={v => setSlideEditForm(p => ({ ...p, icon_name: v }))} /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ToggleSwitch checked={slideEditForm.active} onChange={v => setSlideEditForm(p => ({ ...p, active: v }))} />
            <span style={{ fontSize: 12, color: slideEditForm.active ? "var(--green)" : "var(--gray-500)" }}>
              {slideEditForm.active ? "Ativo" : "Inativo"}
            </span>
          </div>
        </EditModal>
      )}
    </div>
  )
}

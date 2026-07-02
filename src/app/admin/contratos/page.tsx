"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, Plus, Trash2, ChevronDown, ChevronUp, Upload, X } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

type Contract = {
  id: string; type: string; tier: string; title: string; description: string
  objective: string; total: number; sucatas: number; xp: number; rep: number | null
  environmental_risk: string; expires_at: string | null; active: boolean
  image_url: string | null; variant: string | null; faction_id?: string | null
  location: string; estimated_time: string; best_time_of_day: string; climate: string
  story: string; bonus_condition: string; bonus_reward: string
  rewards: unknown[]; objectives: unknown[]; enemies: unknown[]
  success_rate: number; players_completed: number
  best_record_time: string; best_record_player: string
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      title={checked ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
      style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: checked ? "rgba(61,242,139,0.75)" : "rgba(255,255,255,0.12)", position: "relative", transition: "background 0.2s", padding: 0, flexShrink: 0 }}>
      <span style={{ display: "block", width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.35)", position: "absolute", top: 3, left: checked ? 19 : 3, transition: "left 0.2s" }} />
    </button>
  )
}

type Acceptance = {
  id: string; progress: number; status: string; accepted_at: string; user_id: string
  user_name: string; contract_id: string
  contracts: { title: string; total: number; sucatas: number; type: string; tier: string } | null
}

const TYPES = ["Principal", "Secundário", "Diário", "Facção"]
const TIERS = ["Básico", "Avançado", "Épico", "Lendário"]
const RISKS = ["Baixo", "Médio", "Alto", "Extremo"]

type Faction = { id: string; name: string; color: string }

const emptyForm = {
  type: "Principal", tier: "Básico", title: "", description: "", story: "",
  objective: "", total: 1, sucatas: 0, xp: 0, rep: "", location: "",
  estimated_time: "", best_time_of_day: "", climate: "", environmental_risk: "Médio",
  expires_at: "", variant: "", bonus_condition: "", bonus_reward: "",
  image_url: "", success_rate: 50, active: true, faction_id: "",
}

/* ── Seção de contratos ── */
function ContratosSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [factions, setFactions]   = useState<Faction[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(emptyForm)
  const [saving, setSaving]       = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg]   = useState(false)
  const [editingContract, setEditingContract]   = useState<Contract | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditImg, setUploadingEditImg] = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const editImgRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [cRes, fRes] = await Promise.all([
      fetch("/api/admin/contratos").then(r => r.json()).catch(() => ({})),
      fetch("/api/admin/faccoes").then(r => r.json()).catch(() => ({})),
    ])
    setContracts(cRes.contracts ?? [])
    setFactions(fRes.factions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function field(key: string, val: unknown) { setForm(prev => ({ ...prev, [key]: val })) }

  async function save() {
    if (!form.title || !form.objective) return toast.error("Título e objetivo são obrigatórios.")
    setSaving(true)
    const body = { ...form, rep: form.rep === "" ? null : Number(form.rep), expires_at: form.expires_at || null, variant: form.variant || null, faction_id: form.faction_id || null }
    const res = await fetch("/api/admin/contratos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setCreatedId(data.id)
      toast.success("Contrato criado! Agora selecione uma imagem.")
      await load()
      // mantém formulário aberto só para upload da imagem
    } else toast.error("Erro ao criar contrato.")
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/contratos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) })
    await load()
  }

  function openEdit(c: Contract) {
    setEditForm({
      type: c.type, tier: c.tier, title: c.title, description: c.description, story: c.story ?? "",
      objective: c.objective, total: c.total, sucatas: c.sucatas, xp: c.xp,
      rep: c.rep != null ? String(c.rep) : "",
      location: c.location ?? "", estimated_time: c.estimated_time ?? "",
      best_time_of_day: c.best_time_of_day ?? "", climate: c.climate ?? "",
      environmental_risk: c.environmental_risk ?? "Médio",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      variant: c.variant ?? "", bonus_condition: c.bonus_condition ?? "",
      bonus_reward: c.bonus_reward ?? "", image_url: c.image_url ?? "",
      success_rate: c.success_rate ?? 50, active: c.active,
      faction_id: c.faction_id ?? "",
    })
    setEditingContract(c)
  }

  async function saveEdit() {
    if (!editingContract) return
    setSavingEdit(true)
    const body = {
      ...editForm,
      rep: editForm.rep === "" ? null : Number(editForm.rep),
      expires_at: editForm.expires_at || null,
      variant: editForm.variant || null,
      faction_id: editForm.faction_id || null,
      image_url: editForm.image_url || null,
    }
    const res = await fetch(`/api/admin/contratos/${editingContract.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    setSavingEdit(false)
    if (res.ok) { toast.success("Contrato salvo!"); setEditingContract(null); await load() }
    else toast.error("Erro ao salvar contrato.")
  }

  async function uploadEditImage(file: File) {
    if (!editingContract) return
    setUploadingEditImg(true)
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch(`/api/admin/contratos/${editingContract.id}/image`, { method: "POST", body: fd })
    setUploadingEditImg(false)
    if (res.ok) {
      const { url } = await res.json()
      setEditForm(p => ({ ...p, image_url: url }))
      toast.success("Imagem atualizada!")
    } else toast.error("Erro ao enviar imagem.")
  }

  async function uploadImage(id: string, file: File) {
    setUploadingImg(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch(`/api/admin/contratos/${id}/image`, { method: "POST", body: fd })
    setUploadingImg(false)
    if (res.ok) {
      const { url } = await res.json()
      field("image_url", url)
      toast.success("Imagem enviada!")
      await load()
    } else toast.error("Erro ao enviar imagem.")
  }

  async function del(id: string, title: string) {
    const ok = await confirm(`Remover "${title}"? Isso removerá todas as aceitações.`)
    if (!ok) return
    await fetch(`/api/admin/contratos/${id}`, { method: "DELETE" })
    toast.success("Contrato removido.")
    await load()
  }

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "7px 10px", fontSize: 12, borderRadius: 4, font: "inherit", width: "100%" }
  const sel: React.CSSProperties = { ...inp }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }

  return (
    <div className="utility-panel">
      <div className="utility-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>Contratos</strong><small>Contratos ativos exibidos na tela /contratos</small></div>
        <button type="button" onClick={() => { setShowForm(s => !s); setCreatedId(null); setForm(emptyForm) }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "7px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
          {showForm ? <ChevronUp size={12} /> : <Plus size={12} />} {showForm ? "Cancelar" : "Novo Contrato"}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 16, marginBottom: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Tipo</span><select value={form.type} onChange={e => field("type", e.target.value)} style={sel}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
            <label><span style={lbl}>Tier</span><select value={form.tier} onChange={e => field("tier", e.target.value)} style={sel}>{TIERS.map(t => <option key={t}>{t}</option>)}</select></label>
            <label><span style={lbl}>Risco Ambiental</span><select value={form.environmental_risk} onChange={e => field("environmental_risk", e.target.value)} style={sel}>{RISKS.map(r => <option key={r}>{r}</option>)}</select></label>
            <label><span style={lbl}>Variante (opcional)</span><select value={form.variant} onChange={e => field("variant", e.target.value)} style={sel}><option value="">Nenhuma</option><option value="dourada">Dourada</option><option value="holografica">Holográfica</option><option value="corrompida">Corrompida</option></select></label>
            <label>
              <span style={lbl}>Facção (opcional)</span>
              <select value={form.faction_id} onChange={e => field("faction_id", e.target.value)} style={sel}>
                <option value="">Sem facção — visível para todos</option>
                {factions.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Título</span><input value={form.title} onChange={e => field("title", e.target.value)} style={inp} placeholder="Ameaça Mecânica" /></label>
            <label><span style={lbl}>Objetivo principal</span><input value={form.objective} onChange={e => field("objective", e.target.value)} style={inp} placeholder="Elimine 5 ARC Sentinel" /></label>
          </div>
          <label><span style={lbl}>Descrição curta</span><input value={form.description} onChange={e => field("description", e.target.value)} style={inp} /></label>
          <label><span style={lbl}>História / briefing</span><textarea value={form.story} onChange={e => field("story", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            <label><span style={lbl}>Total</span><input type="number" min={1} value={form.total} onChange={e => field("total", Number(e.target.value))} style={inp} /></label>
            <label><span style={lbl}>Sucatas</span><input type="number" min={0} value={form.sucatas} onChange={e => field("sucatas", Number(e.target.value))} style={inp} /></label>
            <label><span style={lbl}>XP</span><input type="number" min={0} value={form.xp} onChange={e => field("xp", Number(e.target.value))} style={inp} /></label>
            <label><span style={lbl}>REP (opcional)</span><input type="number" min={0} value={form.rep} onChange={e => field("rep", e.target.value)} style={inp} placeholder="—" /></label>
            <label><span style={lbl}>Taxa de sucesso %</span><input type="number" min={0} max={100} value={form.success_rate} onChange={e => field("success_rate", Number(e.target.value))} style={inp} /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            <label><span style={lbl}>Localização</span><input value={form.location} onChange={e => field("location", e.target.value)} style={inp} /></label>
            <label><span style={lbl}>Tempo estimado</span><input value={form.estimated_time} onChange={e => field("estimated_time", e.target.value)} style={inp} placeholder="20 - 35 min" /></label>
            <label><span style={lbl}>Melhor horário</span><input value={form.best_time_of_day} onChange={e => field("best_time_of_day", e.target.value)} style={inp} placeholder="Noite" /></label>
            <label><span style={lbl}>Clima</span><input value={form.climate} onChange={e => field("climate", e.target.value)} style={inp} placeholder="Nublado" /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <span style={lbl}>Imagem do contrato</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Preview */}
                <div style={{ width: 44, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                  {form.image_url
                    ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Upload size={16} style={{ color: "var(--gray-500)" }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (createdId) {
                        uploadImage(createdId, file)
                      } else {
                        // Antes de criar: preview local temporário
                        field("image_url", URL.createObjectURL(file))
                        toast.info("Crie o contrato primeiro — a imagem será enviada após salvar.")
                      }
                    }} />
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", opacity: uploadingImg ? 0.6 : 1 }}>
                    {uploadingImg ? "Enviando..." : "Selecionar arquivo"}
                  </button>
                  <input value={form.image_url.startsWith("blob:") ? "" : form.image_url} onChange={e => field("image_url", e.target.value)}
                    style={{ ...inp, fontSize: 10 }} placeholder="ou cole uma URL" />
                </div>
              </div>
            </div>
            <label><span style={lbl}>Bônus — condição</span><input value={form.bonus_condition} onChange={e => field("bonus_condition", e.target.value)} style={inp} placeholder="Elimine todos sem morrer" /></label>
            <label><span style={lbl}>Bônus — recompensa</span><input value={form.bonus_reward} onChange={e => field("bonus_reward", e.target.value)} style={inp} placeholder="+80 REP extra" /></label>
          </div>
          <label><span style={lbl}>Expira em (opcional)</span><input type="datetime-local" value={form.expires_at} onChange={e => field("expires_at", e.target.value)} style={{ ...inp, width: "auto" }} /></label>
          <p style={{ margin: 0, fontSize: 11, color: "var(--gray-500)" }}>Sub-objetivos, inimigos e recompensas de item podem ser adicionados via PATCH após criação (em breve na interface).</p>
          <button type="button" onClick={save} disabled={saving || !form.title || !form.objective}
            style={{ background: "rgba(61,242,139,0.12)", border: "1px solid rgba(61,242,139,0.4)", color: "var(--green)", padding: "9px 20px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", alignSelf: "flex-start" }}>
            {saving ? "Criando..." : "✓ Criar Contrato"}
          </button>
        </div>
      )}

      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {contracts.map(c => {
            const fac = factions.find(f => f.id === c.faction_id)
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--stroke)", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                onClick={() => openEdit(c)}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {/* Thumbnail */}
                {c.image_url
                  ? <img src={c.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
                {/* Badges tipo + tier */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, width: 80 }}>
                  <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{c.type}</span>
                  <span style={{ fontSize: 10, fontWeight: 950, color: "var(--cyan)" }}>{c.tier}</span>
                </div>
                {/* Título */}
                <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 950, color: "var(--paper)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</p>
                {/* Facção */}
                {fac
                  ? <span style={{ fontSize: 10, fontWeight: 950, color: fac.color, flexShrink: 0 }}>{fac.name}</span>
                  : <span style={{ fontSize: 10, color: "var(--gray-500)", flexShrink: 0 }}>—</span>}
                {/* Recompensas */}
                <span style={{ fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, color: "var(--yellow)" }}>{c.sucatas} pts
                  {c.xp > 0 && <span style={{ color: "var(--blue)", marginLeft: 6 }}>{c.xp} xp</span>}
                  {c.rep ? <span style={{ color: "#b477ff", marginLeft: 6 }}>{c.rep} rep</span> : null}
                </span>
                {/* Expira */}
                <span style={{ fontSize: 11, color: "var(--gray-500)", flexShrink: 0, width: 70, textAlign: "right" }}>
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                </span>
                {/* Toggle + delete */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  <ToggleSwitch checked={c.active} onChange={v => toggleActive(c.id, v)} />
                  <button type="button" onClick={() => del(c.id, c.title)}
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex", opacity: 0.5, transition: "opacity 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.5")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
          {contracts.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum contrato cadastrado.</p>}
        </div>
      )}

      {/* Modal de edição */}
      {editingContract && (() => {
        const ef = editForm
        const set = (k: string, v: unknown) => setEditForm(p => ({ ...p, [k]: v }))
        const i: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "7px 10px", fontSize: 12, borderRadius: 6, font: "inherit", width: "100%", outline: "none" }
        const l: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }
        return (
          <div onClick={() => setEditingContract(null)}
            style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "#04090e", border: "1px solid var(--stroke)", borderRadius: 14, width: 640, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--stroke)", flexShrink: 0 }}>
                {ef.image_url
                  ? <img src={ef.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
                <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 950, color: "var(--paper)" }}>{ef.title || editingContract.title}</p>
                <button type="button" onClick={() => setEditingContract(null)}
                  style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 4, display: "flex" }}>
                  <X size={16} />
                </button>
              </div>
              {/* Body */}
              <div style={{ overflowY: "auto", padding: 20, display: "grid", gap: 10, flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Tipo</span><select value={ef.type} onChange={e => set("type", e.target.value)} style={i}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
                  <label><span style={l}>Tier</span><select value={ef.tier} onChange={e => set("tier", e.target.value)} style={i}>{TIERS.map(t => <option key={t}>{t}</option>)}</select></label>
                  <label><span style={l}>Risco</span><select value={ef.environmental_risk} onChange={e => set("environmental_risk", e.target.value)} style={i}>{RISKS.map(r => <option key={r}>{r}</option>)}</select></label>
                  <label><span style={l}>Variante</span><select value={ef.variant} onChange={e => set("variant", e.target.value)} style={i}><option value="">Nenhuma</option><option value="dourada">Dourada</option><option value="holografica">Holográfica</option><option value="corrompida">Corrompida</option></select></label>
                </div>
                <label><span style={l}>Facção</span>
                  <select value={ef.faction_id} onChange={e => set("faction_id", e.target.value)} style={i}>
                    <option value="">Sem facção — visível para todos</option>
                    {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label><span style={l}>Título *</span><input value={ef.title} onChange={e => set("title", e.target.value)} style={i} /></label>
                  <label><span style={l}>Objetivo *</span><input value={ef.objective} onChange={e => set("objective", e.target.value)} style={i} /></label>
                </div>
                <label><span style={l}>Descrição</span><input value={ef.description} onChange={e => set("description", e.target.value)} style={i} /></label>
                <label><span style={l}>História / briefing</span><textarea value={ef.story} onChange={e => set("story", e.target.value)} rows={2} style={{ ...i, resize: "vertical" }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                  <label><span style={l}>Total</span><input type="number" min={1} value={ef.total} onChange={e => set("total", Number(e.target.value))} style={i} /></label>
                  <label><span style={l}>Sucatas</span><input type="number" min={0} value={ef.sucatas} onChange={e => set("sucatas", Number(e.target.value))} style={i} /></label>
                  <label><span style={l}>XP</span><input type="number" min={0} value={ef.xp} onChange={e => set("xp", Number(e.target.value))} style={i} /></label>
                  <label><span style={l}>REP</span><input type="number" min={0} value={ef.rep} onChange={e => set("rep", e.target.value)} style={i} placeholder="—" /></label>
                  <label><span style={l}>Sucesso %</span><input type="number" min={0} max={100} value={ef.success_rate} onChange={e => set("success_rate", Number(e.target.value))} style={i} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Localização</span><input value={ef.location} onChange={e => set("location", e.target.value)} style={i} /></label>
                  <label><span style={l}>Tempo est.</span><input value={ef.estimated_time} onChange={e => set("estimated_time", e.target.value)} style={i} placeholder="20-35 min" /></label>
                  <label><span style={l}>Melhor horário</span><input value={ef.best_time_of_day} onChange={e => set("best_time_of_day", e.target.value)} style={i} /></label>
                  <label><span style={l}>Clima</span><input value={ef.climate} onChange={e => set("climate", e.target.value)} style={i} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Bônus — condição</span><input value={ef.bonus_condition} onChange={e => set("bonus_condition", e.target.value)} style={i} /></label>
                  <label><span style={l}>Bônus — recompensa</span><input value={ef.bonus_reward} onChange={e => set("bonus_reward", e.target.value)} style={i} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                  <label><span style={l}>Expira em</span><input type="datetime-local" value={ef.expires_at} onChange={e => set("expires_at", e.target.value)} style={i} /></label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2 }}>
                    <ToggleSwitch checked={ef.active} onChange={v => set("active", v)} />
                    <span style={{ fontSize: 12, color: ef.active ? "var(--green)" : "var(--gray-500)" }}>{ef.active ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                {/* Imagem */}
                <div>
                  <span style={l}>Imagem</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                      {ef.image_url ? <img src={ef.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Upload size={14} style={{ color: "var(--gray-500)" }} />}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      <input ref={editImgRef} type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadEditImage(f) }} />
                      <button type="button" onClick={() => editImgRef.current?.click()} disabled={uploadingEditImg}
                        style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "4px 8px", borderRadius: 4, cursor: "pointer", font: "inherit", opacity: uploadingEditImg ? 0.6 : 1 }}>
                        {uploadingEditImg ? "Enviando..." : "Upload"}
                      </button>
                      <input value={ef.image_url} onChange={e => set("image_url", e.target.value)} placeholder="ou cole uma URL" style={i} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ display: "flex", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--stroke)", flexShrink: 0 }}>
                <button type="button" onClick={() => setEditingContract(null)}
                  style={{ border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit" }}>
                  Cancelar
                </button>
                <button type="button" onClick={saveEdit} disabled={savingEdit}
                  style={{ border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "8px 20px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", opacity: savingEdit ? 0.6 : 1 }}>
                  {savingEdit ? "Salvando..." : "✓ Salvar"}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ── Seção de aceitações ── */
function AcceitancesSection() {
  const toast = useToast()
  const [items, setItems]       = useState<Acceptance[]>([])
  const [loading, setLoading]   = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/contratos/acceptances")
    const body = await res.json().catch(() => ({}))
    setItems(body.acceptances ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateProgress(id: string, progress: number) {
    await fetch(`/api/admin/contratos/acceptances/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) })
    await load()
  }

  async function complete(id: string) {
    setCompleting(id)
    const res = await fetch(`/api/admin/contratos/acceptances/${id}/complete`, { method: "POST" })
    setCompleting(null)
    if (res.ok) {
      const body = await res.json()
      toast.success(`✓ Concluído! ${body.sucatas_credited} pts creditados.`)
      await load()
    } else toast.error("Erro ao concluir.")
  }

  const STATUS_COLOR: Record<string, string> = {
    active: "var(--yellow)", completed: "var(--green)", failed: "var(--red)", expired: "var(--gray-500)"
  }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head">
        <strong>Aceitações de Contratos</strong>
        <small>Progresso dos usuários — atualize e conclua para creditar recompensas</small>
      </div>
      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)", textAlign: "left" }}>
              {["Usuário","Contrato","Tipo","Progresso","Status","Aceito em","Ação"].map(h => (
                <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(a => {
              const contract = a.contracts
              const total    = contract?.total ?? 1
              const pct      = Math.min(100, Math.round((a.progress / total) * 100))
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px", fontWeight: 800 }}>{a.user_name}</td>
                  <td style={{ padding: "8px" }}>{contract?.title ?? "—"}</td>
                  <td style={{ padding: "8px" }}><span style={{ fontSize: 10, fontWeight: 950, opacity: 0.7 }}>{contract?.type ?? "—"}</span></td>
                  <td style={{ padding: "8px", minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="number" min={0} max={total} value={a.progress}
                        onChange={e => updateProgress(a.id, Number(e.target.value))}
                        style={{ width: 52, background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "4px 6px", fontSize: 11, borderRadius: 4, font: "inherit" }} />
                      <span style={{ color: "var(--muted)", fontSize: 11 }}>/ {total}</span>
                      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--cyan)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, color: STATUS_COLOR[a.status] ?? "var(--muted)" }}>
                      {a.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "8px", color: "var(--muted)", fontSize: 11 }}>
                    {new Date(a.accepted_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td style={{ padding: "8px" }}>
                    {a.status === "active" && (
                      <button type="button" onClick={() => complete(a.id)} disabled={completing === a.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "5px 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit", opacity: completing === a.id ? 0.6 : 1 }}>
                        <CheckCircle size={11} /> {completing === a.id ? "..." : "Concluir"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhuma aceitação registrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Seção de passes de batalha ── */
function PassesSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [passes, setPasses]         = useState<any[]>([])
  const [factions, setFactions]     = useState<Faction[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [missions, setMissions]     = useState<Record<string, any[]>>({})
  const [completing, setCompleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    faction_id: "", title: "", description: "", type: "weekly",
    starts_at: "", expires_at: "", active: true,
    price_points: 0, price_real: 0, image_url: "",
  })
  const [uploadingPassImg, setUploadingPassImg] = useState(false)
  const [createdPassId, setCreatedPassId]       = useState<string | null>(null)
  const passFileRef    = useRef<HTMLInputElement>(null)
  const passRowFileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [mForm, setMForm] = useState({
    position: 1, title: "", description: "", total: 1, points_reward: 0,
  })
  // Estados de edição inline de descrição por missão
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [editingDescVal, setEditingDescVal] = useState("")
  const [savingPass, setSavingPass] = useState(false)
  const [savingMission, setSavingMission] = useState(false)
  // Item search por missão
  const [itemSearchMission, setItemSearchMission] = useState<string | null>(null) // mission id
  const [itemQuery, setItemQuery] = useState("")
  const [itemResults, setItemResults] = useState<any[]>([])
  const [searchingItem, setSearchingItem] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [pRes, fRes] = await Promise.all([
      fetch("/api/admin/faccoes/passes").then(r => r.json()).catch(() => ({})),
      fetch("/api/admin/faccoes").then(r => r.json()).catch(() => ({})),
    ])
    setPasses(pRes.groups ?? [])
    setFactions(fRes.factions ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadMissions(groupId: string) {
    const res = await fetch(`/api/admin/faccoes/passes/${groupId}/missions`)
    const body = await res.json().catch(() => ({}))
    setMissions(prev => ({ ...prev, [groupId]: body.missions ?? [] }))
  }

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    await loadMissions(id)
  }

  async function createPass() {
    if (!form.title || !form.starts_at || !form.expires_at) return toast.error("Preencha título, início e expiração.")
    setSavingPass(true)
    const payload = { ...form, faction_id: form.faction_id || null, image_url: form.image_url || null }
    const res = await fetch("/api/admin/faccoes/passes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    })
    setSavingPass(false)
    if (res.ok) {
      const data = await res.json()
      setCreatedPassId(data.id)
      toast.success("Contrato criado! Adicione uma imagem se desejar.")
      await load()
    } else toast.error("Erro ao criar contrato.")
  }

  async function uploadPassImage(id: string, file: File) {
    setUploadingPassImg(true)
    const fd = new FormData()
    fd.append("file", file)
    // Reutiliza o bucket contract-images via o endpoint de imagem de contratos
    // mas salvamos a URL no passe via PATCH
    const ext = file.name.split(".").pop() ?? "png"
    const path = `pass-${id}.${ext}`
    const buffer = await file.arrayBuffer()
    const uploadRes = await fetch(`/api/admin/faccoes/passes/${id}/image`, {
      method: "POST", body: fd,
    })
    setUploadingPassImg(false)
    if (uploadRes.ok) {
      const { url } = await uploadRes.json()
      setForm(p => ({ ...p, image_url: url }))
      toast.success("Imagem enviada!")
      await load()
    } else toast.error("Erro ao enviar imagem.")
  }

  async function searchItems(q: string) {
    if (!q.trim()) { setItemResults([]); return }
    setSearchingItem(true)
    const res = await fetch(`/api/admin/catalog?q=${encodeURIComponent(q)}&limit=6`)
    const body = await res.json().catch(() => ({}))
    setItemResults(body.items ?? [])
    setSearchingItem(false)
  }

  async function setMissionItem(missionId: string, item: any, groupId: string) {
    await fetch(`/api/admin/faccoes/passes/missions/${missionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_reward: {
          item_name:    item.name,
          item_image:   item.icon_url ?? item.image ?? null,
          item_rarity:  item.rarity ?? null,
          item_qty:     1,
        },
        points_reward: 0, // missões de item não dão pontos
      }),
    })
    setItemSearchMission(null)
    setItemQuery("")
    setItemResults([])
    toast.success(`Item "${item.name}" vinculado à missão!`)
    await loadMissions(groupId)
  }

  async function clearMissionItem(missionId: string, groupId: string) {
    await fetch(`/api/admin/faccoes/passes/missions/${missionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_reward: null }),
    })
    toast.success("Item removido da missão.")
    await loadMissions(groupId)
  }

  async function deletePass(id: string) {
    const ok = await confirm("Remover este contrato e todo o progresso dos usuários?")
    if (!ok) return
    await fetch(`/api/admin/faccoes/passes/${id}`, { method: "DELETE" })
    toast.success("Contrato removido.")
    await load()
  }

  async function addMission(groupId: string) {
    if (!mForm.title) return toast.error("Título da missão obrigatório.")
    setSavingMission(true)
    const res = await fetch(`/api/admin/faccoes/passes/${groupId}/missions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...mForm, group_id: groupId }),
    })
    setSavingMission(false)
    if (res.ok) {
      toast.success("Missão adicionada!")
      setMForm({ position: mForm.position + 1, title: "", description: "", total: 1, points_reward: 0 })
      await loadMissions(groupId)
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error(`Erro: ${body.error ?? "Não foi possível adicionar a missão."}`)
    }
  }

  async function completeMission(missionId: string, userId: string) {
    setCompleting(missionId)
    const res = await fetch(`/api/admin/faccoes/passes/missions/${missionId}/complete`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId }),
    })
    setCompleting(null)
    if (res.ok) {
      const body = await res.json()
      toast.success(`✓ Missão concluída! ${body.points_credited} pts creditados.`)
    } else toast.error("Erro ao concluir missão.")
  }

  const TYPE_LABEL: Record<string, string> = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" }
  const TYPE_COLOR: Record<string, string> = { daily: "var(--green)", weekly: "var(--yellow)", monthly: "var(--purple)" }
  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "7px 10px", fontSize: 12, borderRadius: 4, font: "inherit", width: "100%" }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>Contratos Sequenciais de Facção</strong><small>Diários (1 missão), Semanais (7) e Mensais (30)</small></div>
        <button type="button" onClick={() => { setShowForm(s => !s); setCreatedPassId(null); setForm(f => ({ ...f, image_url: "" })) }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "7px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
          {showForm ? <ChevronUp size={12} /> : <Plus size={12} />} {showForm ? "Cancelar" : "Novo Contrato"}
        </button>
      </div>

      {/* Formulário novo passe */}
      {showForm && (
        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 16, marginBottom: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Facção *</span>
              <select value={form.faction_id} onChange={e => setForm(p => ({ ...p, faction_id: e.target.value }))} style={inp}>
                <option value="">Selecionar...</option>
                {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
            <label><span style={lbl}>Tipo *</span>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                <option value="daily">Diário (1 missão)</option>
                <option value="weekly">Semanal (7 missões)</option>
                <option value="monthly">Mensal (30 missões)</option>
              </select>
            </label>
            <label><span style={lbl}>Título *</span><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inp} placeholder="Semana da Guardia #1" /></label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label><span style={lbl}>Início *</span><input type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} style={inp} /></label>
            <label><span style={lbl}>Expira em *</span><input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} style={inp} /></label>
          </div>
          {/* Imagem do contrato */}
          <div>
            <span style={lbl}>Imagem do contrato</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 8, background: "rgba(255,255,255,0.05)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                {form.image_url
                  ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <Upload size={18} style={{ color: "var(--gray-500)" }} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <input ref={passFileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (createdPassId) {
                      uploadPassImage(createdPassId, file)
                    } else {
                      setForm(p => ({ ...p, image_url: URL.createObjectURL(file) }))
                      toast.info("Crie o contrato primeiro — a imagem será enviada após salvar.")
                    }
                  }} />
                <button type="button" onClick={() => passFileRef.current?.click()} disabled={uploadingPassImg}
                  style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", opacity: uploadingPassImg ? 0.6 : 1 }}>
                  {uploadingPassImg ? "Enviando..." : "Selecionar arquivo"}
                </button>
                <input value={form.image_url.startsWith("blob:") ? "" : form.image_url}
                  onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                  style={{ ...inp, fontSize: 10 }} placeholder="ou cole uma URL" />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <span style={lbl}>Preço em Sucatas (0 = gratuito)</span>
              <input type="number" min={0} value={form.price_points} onChange={e => setForm(p => ({ ...p, price_points: Number(e.target.value) }))} style={inp} />
            </label>
            <label>
              <span style={lbl}>Preço em R$ (0 = sem pagamento PIX)</span>
              <input type="number" min={0} step={0.01} value={form.price_real} onChange={e => setForm(p => ({ ...p, price_real: Number(e.target.value) }))} style={inp} placeholder="Ex: 9.90" />
            </label>
          </div>
          <button type="button" onClick={createPass} disabled={savingPass}
            style={{ background: "rgba(61,242,139,0.12)", border: "1px solid rgba(61,242,139,0.4)", color: "var(--green)", padding: "9px 20px", fontSize: 12, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", alignSelf: "flex-start" }}>
            {savingPass ? "Criando..." : "✓ Criar Contrato"}
          </button>
        </div>
      )}

      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {passes.map(p => {
            const fac = p.factions
            const isExpanded = expanded === p.id
            const groupMissions = missions[p.id] ?? []
            return (
              <div key={p.id} style={{ border: "1px solid var(--stroke)", borderRadius: 8, overflow: "hidden" }}>
                {/* Header do passe */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", cursor: "pointer" }} onClick={() => toggleExpand(p.id)}>
                  <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, background: `color-mix(in srgb, ${TYPE_COLOR[p.type]} 15%, transparent)`, color: TYPE_COLOR[p.type], border: `1px solid color-mix(in srgb, ${TYPE_COLOR[p.type]} 30%, transparent)` }}>
                    {TYPE_LABEL[p.type] ?? p.type}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: fac?.color ?? "var(--paper)" }}>{fac?.name ?? "—"}</span>
                  <span style={{ fontSize: 13 }}>{p.title}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--gray-500)" }}>
                    {new Date(p.starts_at).toLocaleDateString("pt-BR")} → {new Date(p.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                  <ToggleSwitch checked={p.active} onChange={async v => {
                    await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: v }) })
                    await load()
                  }} />
                  <button type="button" onClick={e => { e.stopPropagation(); deletePass(p.id) }} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                  {isExpanded ? <ChevronUp size={14} style={{ color: "var(--gray-500)" }} /> : <ChevronDown size={14} style={{ color: "var(--gray-500)" }} />}
                </div>

                {/* Expander: dados + missões */}
                {isExpanded && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid var(--stroke)" }}>

                    {/* ── Dados do passe (editáveis) ── */}
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Dados do Contrato</p>
                    <div style={{ display: "grid", gap: 10, marginBottom: 18, padding: 12, background: "rgba(0,0,0,0.15)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      {/* Título e descrição */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Título</span>
                          <input defaultValue={p.title}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: e.target.value }) }); await load() }}
                            style={inp} />
                        </label>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Descrição</span>
                          <input defaultValue={p.description}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: e.target.value }) }); await load() }}
                            style={inp} />
                        </label>
                      </div>
                      {/* Preços */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Preço em Sucatas</span>
                          <input type="number" min={0} defaultValue={p.price_points ?? 0}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price_points: Number(e.target.value) }) }); await load() }}
                            style={inp} />
                        </label>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Preço em R$</span>
                          <input type="number" min={0} step={0.01} defaultValue={p.price_real ?? 0}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price_real: Number(e.target.value) }) }); await load() }}
                            style={inp} />
                        </label>
                      </div>
                      {/* Datas */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Início</span>
                          <input type="datetime-local" defaultValue={p.starts_at?.slice(0, 16)}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starts_at: e.target.value }) }); await load() }}
                            style={inp} />
                        </label>
                        <label style={{ display: "grid", gap: 3 }}>
                          <span style={{ ...lbl, marginBottom: 0 }}>Expira em</span>
                          <input type="datetime-local" defaultValue={p.expires_at?.slice(0, 16)}
                            onBlur={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expires_at: e.target.value }) }); await load() }}
                            style={inp} />
                        </label>
                      </div>
                      {/* Facção */}
                      <label style={{ display: "grid", gap: 3 }}>
                        <span style={{ ...lbl, marginBottom: 0 }}>Facção vinculada</span>
                        <select defaultValue={p.faction_id ?? ""}
                          onChange={async e => { await fetch(`/api/admin/faccoes/passes/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ faction_id: e.target.value || null }) }); toast.success("Facção atualizada."); await load() }}
                          style={{ ...inp, color: factions.find(f => f.id === p.faction_id)?.color ?? "var(--gray-500)" }}>
                          <option value="">— Sem facção (contrato geral)</option>
                          {factions.map(f => <option key={f.id} value={f.id} style={{ color: "var(--paper)" }}>{f.name}</option>)}
                        </select>
                      </label>
                    </div>

                    {/* Imagem do contrato */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width: 56, height: 40, borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center" }}>
                        {p.image_url
                          ? <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <Upload size={14} style={{ color: "var(--gray-500)" }} />}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Imagem do contrato</span>
                        <input
                          type="file" accept="image/*" style={{ display: "none" }}
                          ref={el => { passRowFileRefs.current[p.id] = el }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadPassImage(p.id, f) }}
                        />
                        <button type="button" onClick={() => passRowFileRefs.current[p.id]?.click()} disabled={uploadingPassImg}
                          style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", background: "none", border: "1px solid rgba(0,217,255,0.3)", borderRadius: 4, padding: "4px 10px", cursor: "pointer", font: "inherit", opacity: uploadingPassImg ? 0.5 : 1 }}>
                          {uploadingPassImg ? "Enviando..." : "Alterar imagem"}
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Missões ({groupMissions.length})</p>

                    {/* Lista de missões */}
                    <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                      {groupMissions.map((m: any) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
                          <span style={{ width: 24, height: 24, borderRadius: "50%", background: m.position % 5 === 0 ? "rgba(255,212,0,0.2)" : "rgba(255,255,255,0.05)", border: m.position % 5 === 0 ? "1px solid rgba(255,212,0,0.4)" : "1px solid var(--stroke)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 950, color: m.position % 5 === 0 ? "var(--yellow)" : "var(--gray-500)", flexShrink: 0 }}>
                            {m.position}
                          </span>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ fontWeight: 800, fontSize: 12 }}>{m.title}</span>
                            {editingDescId === m.id ? (
                              <div style={{ display: "flex", gap: 4 }}>
                                <input autoFocus value={editingDescVal} onChange={e => setEditingDescVal(e.target.value)}
                                  placeholder="Descrição da missão"
                                  style={{ ...inp, fontSize: 11, flex: 1 }}
                                  onKeyDown={async e => {
                                    if (e.key === "Enter") {
                                      await fetch(`/api/admin/faccoes/passes/missions/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: editingDescVal }) })
                                      setEditingDescId(null)
                                      await loadMissions(p.id)
                                    } else if (e.key === "Escape") {
                                      setEditingDescId(null)
                                    }
                                  }} />
                                <button type="button" onClick={async () => {
                                    await fetch(`/api/admin/faccoes/passes/missions/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: editingDescVal }) })
                                    setEditingDescId(null)
                                    await loadMissions(p.id)
                                  }}
                                  style={{ background: "rgba(61,242,139,0.1)", border: "1px solid rgba(61,242,139,0.3)", color: "var(--green)", fontSize: 10, padding: "3px 8px", borderRadius: 4, cursor: "pointer", font: "inherit", fontWeight: 950 }}>✓</button>
                                <button type="button" onClick={() => setEditingDescId(null)}
                                  style={{ background: "none", border: "1px solid var(--stroke)", color: "var(--muted)", fontSize: 10, padding: "3px 8px", borderRadius: 4, cursor: "pointer", font: "inherit" }}>✕</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: m.description ? "var(--gray-500)" : "rgba(255,255,255,0.15)", cursor: "pointer", fontStyle: m.description ? "normal" : "italic" }}
                                onClick={() => { setEditingDescId(m.id); setEditingDescVal(m.description ?? "") }}>
                                {m.description || "Clique para adicionar descrição..."}
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>total: {m.total}</span>
                          {/* Input editável de pontos */}
                          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="number" min={0}
                              defaultValue={m.points_reward ?? 0}
                              onBlur={async e => {
                                const val = Number(e.target.value)
                                if (val === (m.points_reward ?? 0)) return
                                const res = await fetch(`/api/admin/faccoes/passes/missions/${m.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ points_reward: val }),
                                })
                                if (res.ok) { toast.success("Pontos atualizados!"); await loadMissions(p.id) }
                                else toast.error("Erro ao atualizar pontos.")
                              }}
                              style={{ width: 64, background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--yellow)", padding: "3px 6px", fontSize: 11, fontWeight: 950, borderRadius: 4, font: "inherit", textAlign: "right" }}
                            />
                            <span style={{ fontSize: 10, color: "var(--yellow)" }}>pts</span>
                          </label>
                          {/* Controle de item */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
                            {m.item_reward ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: "rgba(0,217,255,0.06)", border: "1px solid rgba(0,217,255,0.2)", borderRadius: 5 }}>
                                {m.item_reward.item_image
                                  ? <img src={m.item_reward.item_image} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
                                  : <span style={{ fontSize: 13 }}>🎁</span>}
                                <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 800, flex: 1 }}>{m.item_reward.item_name}</span>
                                <button type="button" onClick={() => clearMissionItem(m.id, p.id)}
                                  style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 0, fontSize: 11, display: "flex" }}>✕</button>
                              </div>
                            ) : itemSearchMission === m.id ? (
                              <div style={{ position: "relative" }}>
                                <input autoFocus value={itemQuery}
                                  onChange={e => { setItemQuery(e.target.value); searchItems(e.target.value) }}
                                  placeholder="Buscar item no catálogo..."
                                  style={{ ...inp, fontSize: 11, width: "100%" }} />
                                {(itemResults.length > 0 || searchingItem) && (
                                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 6, overflow: "hidden", maxHeight: 180, overflowY: "auto" }}>
                                    {searchingItem && <p style={{ margin: 0, padding: "8px 10px", fontSize: 11, color: "var(--muted)" }}>Buscando...</p>}
                                    {itemResults.map((item: any) => (
                                      <button key={item.id} type="button"
                                        onClick={() => setMissionItem(m.id, item, p.id)}
                                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", textAlign: "left", font: "inherit" }}>
                                        {(item.icon_url ?? item.image) && <img src={item.icon_url ?? item.image} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                                        <span style={{ fontSize: 11, color: "var(--paper)" }}>{item.name}</span>
                                        {item.rarity && <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: "auto" }}>{item.rarity}</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <button type="button" onClick={() => { setItemSearchMission(null); setItemQuery(""); setItemResults([]) }}
                                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 0 }}>✕</button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => { setItemSearchMission(m.id); setItemQuery(""); setItemResults([]) }}
                                style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)", background: "none", border: "1px dashed rgba(0,217,255,0.3)", borderRadius: 4, padding: "3px 8px", cursor: "pointer", font: "inherit", whiteSpace: "nowrap" }}>
                                + Item
                              </button>
                            )}
                          </div>
                          <button type="button"
                            onClick={async () => {
                              const ok = await confirm(`Remover missão #${m.position}?`)
                              if (!ok) return
                              await fetch(`/api/admin/faccoes/passes/missions/${m.id}`, { method: "DELETE" })
                              await loadMissions(p.id)
                            }}
                            style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {groupMissions.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Nenhuma missão adicionada.</p>}
                    </div>

                    {/* Adicionar missão */}
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto auto auto", gap: 8, alignItems: "end" }}>
                        <label style={{ display: "grid", gap: 3 }}><span style={{ ...lbl, marginBottom: 2 }}>#</span><input type="number" min={1} value={mForm.position} onChange={e => setMForm(p => ({ ...p, position: Number(e.target.value) }))} style={{ ...inp, width: 52 }} /></label>
                        <label style={{ display: "grid", gap: 3 }}><span style={{ ...lbl, marginBottom: 2 }}>Título da missão</span><input value={mForm.title} onChange={e => setMForm(p => ({ ...p, title: e.target.value }))} style={inp} placeholder="Elimine 5 inimigos ARC" /></label>
                        <label style={{ display: "grid", gap: 3 }}><span style={{ ...lbl, marginBottom: 2 }}>Descrição (opcional)</span><input value={mForm.description} onChange={e => setMForm(p => ({ ...p, description: e.target.value }))} style={inp} placeholder="Complete a tarefa para avançar" /></label>
                        <label style={{ display: "grid", gap: 3 }}><span style={{ ...lbl, marginBottom: 2 }}>Total</span><input type="number" min={1} value={mForm.total} onChange={e => setMForm(p => ({ ...p, total: Number(e.target.value) }))} style={{ ...inp, width: 64 }} /></label>
                        <label style={{ display: "grid", gap: 3 }}><span style={{ ...lbl, marginBottom: 2 }}>Pontos</span><input type="number" min={0} value={mForm.points_reward} onChange={e => setMForm(p => ({ ...p, points_reward: Number(e.target.value) }))} style={{ ...inp, width: 80 }} /></label>
                        <button type="button" onClick={() => addMission(p.id)} disabled={savingMission || !mForm.title}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "7px 12px", fontSize: 11, fontWeight: 950, cursor: "pointer", borderRadius: 4, font: "inherit", alignSelf: "end", textTransform: "uppercase" }}>
                          <Plus size={11} /> {savingMission ? "..." : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {passes.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum contrato sequencial criado.</p>}
        </div>
      )}
    </div>
  )
}

/* ── Seção de agendamentos de entrega ── */
function SchedulesSection() {
  const toast = useToast()
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/contratos/schedules")
    const body = await res.json().catch(() => ({}))
    setSchedules(body.schedules ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function confirm(id: string) {
    setConfirming(id)
    const res = await fetch(`/api/admin/contratos/schedules/${id}/confirm`, { method: "POST" })
    setConfirming(null)
    if (res.ok) {
      const body = await res.json()
      toast.success(`✓ Entrega confirmada! ${body.points_credited > 0 ? `${body.points_credited} pts creditados.` : ""} ${body.item_credited ? `Item "${body.item_credited}" adicionado ao inventário.` : ""}`)
      await load()
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? "Erro ao confirmar entrega.")
    }
  }

  const STATUS_COLOR: Record<string, string> = { scheduled: "var(--cyan)", pending: "var(--yellow)", confirmed: "var(--green)", expired: "var(--gray-500)", cancelled: "var(--red)" }

  return (
    <div className="utility-panel" style={{ marginBottom: 16 }}>
      <div className="utility-panel-head">
        <strong>Agendamentos de Entrega</strong>
        <small>Missões de contratos sequenciais aguardando confirmação</small>
      </div>
      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)", textAlign: "left" }}>
              {["Usuário", "Game ID", "Contrato", "Missão", "Horário", "Prazo", "Status", "Ação"].map(h => (
                <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map(s => {
              const mission = s.contract_group_missions as { position: number; title: string; points_reward: number; item_reward: any } | null
              const group   = s.contract_groups as { title: string; type: string } | null
              const isOverdue = s.scheduled_at && new Date(s.scheduled_at) < new Date()
              return (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px", fontWeight: 800 }}>{s.user_name}</td>
                  <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11, color: "var(--cyan)" }}>{s.game_id ?? "—"}</td>
                  <td style={{ padding: "8px" }}><span style={{ fontSize: 10, opacity: 0.7 }}>{group?.type?.toUpperCase()}</span><br />{group?.title ?? "—"}</td>
                  <td style={{ padding: "8px" }}>Dia {mission?.position} — {mission?.title ?? "—"}<br />
                    {mission?.points_reward ? <span style={{ color: "var(--yellow)", fontSize: 10 }}>{mission.points_reward} pts</span> : null}
                    {mission?.item_reward ? <span style={{ color: "var(--cyan)", fontSize: 10 }}> 🎁 {mission.item_reward.item_name}</span> : null}
                  </td>
                  <td style={{ padding: "8px", color: isOverdue ? "var(--red)" : "var(--paper)", fontSize: 11, whiteSpace: "nowrap" }}>
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : <em style={{ color: "var(--gray-500)" }}>Não agendado</em>}
                  </td>
                  <td style={{ padding: "8px", fontSize: 11, color: new Date(s.expires_at) < new Date() ? "var(--red)" : "var(--gray-500)", whiteSpace: "nowrap" }}>
                    {new Date(s.expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ fontSize: 10, fontWeight: 950, color: STATUS_COLOR[s.status] ?? "var(--muted)" }}>{s.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    {s.status === "scheduled" && (
                      <button type="button" onClick={() => confirm(s.id)} disabled={confirming === s.id}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "5px 10px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit", opacity: confirming === s.id ? 0.6 : 1 }}>
                        <CheckCircle size={11} /> {confirming === s.id ? "..." : "Confirmar"}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {schedules.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhum agendamento pendente.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function AdminContratosPage() {
  return (
    <div>
      <SchedulesSection />
      <ContratosSection />
      <AcceitancesSection />
      <PassesSection />
      <RewardsSection />
    </div>
  )
}

/* ── Seção de recompensas por pontos ── */
function RewardsSection() {
  const toast = useToast()
  const { confirm } = useConfirm()
  const [rewards, setRewards]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [query, setQuery]         = useState("")
  const [results, setResults]     = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [threshold, setThreshold] = useState(1000)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/contratos/rewards")
    const body = await res.json().catch(() => ({}))
    setRewards(body.rewards ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function searchItems(q: string) {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`/api/admin/catalog?q=${encodeURIComponent(q)}&limit=20`)
    const body = await res.json().catch(() => ({}))
    setResults(body.items ?? [])
    setSearching(false)
  }

  async function addReward(item: any) {
    setSaving(true)
    const res = await fetch("/api/admin/contratos/rewards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id, points_threshold: threshold }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success(`Recompensa "${item.name}" adicionada!`)
      setQuery(""); setResults([])
      await load()
    } else toast.error("Erro ao adicionar recompensa.")
  }

  async function deleteReward(id: string, name: string) {
    const ok = await confirm(`Remover a recompensa "${name}"?`)
    if (!ok) return
    await fetch(`/api/admin/contratos/rewards/${id}`, { method: "DELETE" })
    toast.success("Recompensa removida.")
    await load()
  }

  const inp: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)", padding: "7px 10px", fontSize: 12, borderRadius: 4, font: "inherit" }
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }

  return (
    <div className="utility-panel" style={{ marginTop: 16 }}>
      <div className="utility-panel-head">
        <strong>Próximas Recompensas (por Pontos)</strong>
        <small>Itens desbloqueados ao atingir determinada quantidade de sucatas acumuladas</small>
      </div>

      {/* Formulário de adição */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 16, padding: 12, background: "rgba(0,0,0,0.15)", borderRadius: 8, border: "1px solid var(--stroke)" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            <span style={lbl}>Buscar item no catálogo</span>
            <div style={{ position: "relative" }}>
              <input value={query} onChange={e => { setQuery(e.target.value); searchItems(e.target.value) }}
                placeholder="Ex: Caixa de Componentes Épicos..." style={{ ...inp, width: "100%" }} />
              {(results.length > 0 || searching) && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 8, overflow: "hidden", maxHeight: 400, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  {searching && <p style={{ margin: 0, padding: "10px 14px", fontSize: 11, color: "var(--muted)" }}>Buscando...</p>}
                  {!searching && results.length === 0 && <p style={{ margin: 0, padding: "10px 14px", fontSize: 11, color: "var(--muted)" }}>Nenhum item encontrado.</p>}
                  {results.map((item: any) => (
                    <button key={item.id} type="button" onClick={() => addReward(item)} disabled={saving}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left", font: "inherit", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <div style={{ width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                        {item.icon_url
                          ? <img src={item.icon_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />
                          : <span style={{ fontSize: 10, color: "var(--gray-500)" }}>—</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, color: "var(--paper)", display: "block", fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
                        {item.rarity && <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{item.rarity}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 950, flexShrink: 0, opacity: 0.7 }}>+ {threshold.toLocaleString("pt-BR")} pts</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
        </div>
        <label style={{ display: "grid", gap: 4, alignSelf: "end" }}>
          <span style={lbl}>Limiar de pontos</span>
          <input type="number" min={1} value={threshold} onChange={e => setThreshold(Number(e.target.value))}
            style={{ ...inp, width: 120 }} />
        </label>
      </div>

      {/* Tabela */}
      {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)", textAlign: "left" }}>
              {["Item", "Raridade", "Limiar de Pontos", "Ativo", ""].map(h => (
                <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rewards.map((r: any) => {
              const item = r.catalog_items
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "8px", display: "flex", alignItems: "center", gap: 8 }}>
                    {item?.icon_url && <img src={item.icon_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} />}
                    <span style={{ fontWeight: 800 }}>{item?.name ?? "—"}</span>
                  </td>
                  <td style={{ padding: "8px", color: "var(--muted)", fontSize: 11 }}>{item?.rarity ?? "—"}</td>
                  <td style={{ padding: "8px" }}>
                    <input type="number" min={1} defaultValue={r.points_threshold}
                      onBlur={async e => {
                        const val = Number(e.target.value)
                        if (val === r.points_threshold) return
                        await fetch(`/api/admin/contratos/rewards/${r.id}`, {
                          method: "PATCH", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ points_threshold: val }),
                        })
                        await load()
                      }}
                      style={{ ...inp, width: 100, color: "var(--yellow)", fontWeight: 950 }} />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <ToggleSwitch checked={r.active} onChange={async v => {
                      await fetch(`/api/admin/contratos/rewards/${r.id}`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ active: v }),
                      })
                      await load()
                    }} />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <button type="button" onClick={() => deleteReward(r.id, item?.name ?? "—")}
                      style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {rewards.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhuma recompensa cadastrada. Busque um item acima para adicionar.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

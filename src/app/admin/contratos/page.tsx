"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, Plus, Trash2, ChevronUp, Upload, ArrowLeft } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"
import { useAdminSubpage } from "@/components/admin-subpage-context"

type Contract = {
  id: string; contract_type: string; mission_type: string
  price_points: number; price_real: number
  type: string; tier: string; title: string; description: string
  objective: string; total: number; sucatas: number; xp: number; rep: number | null
  environmental_risk: string; expires_at: string | null; active: boolean
  image_url: string | null; variant: string | null; faction_id?: string | null
  location: string; estimated_time: string; best_time_of_day: string; climate: string
  story: string
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


const CONTRACT_TYPES = [
  { value: "comum",  label: "Comum — visível para todos" },
  { value: "faccao", label: "Facção — exclusivo de facção" },
] as const

const MISSION_TYPES = [
  { value: "diario",  label: "Diário (1 objetivo)",  count: 1  },
  { value: "semanal", label: "Semanal (7 objetivos)", count: 7  },
  { value: "mensal",  label: "Mensal (30 objetivos)", count: 30 },
] as const

const TIERS = ["Básico", "Avançado", "Épico", "Lendário"]
const RISKS = ["Baixo", "Médio", "Alto", "Extremo"]

type Faction = { id: string; name: string; color: string }

const emptyForm = {
  contract_type: "comum", mission_type: "diario",
  price_points: 0, price_real: 0,
  tier: "Básico", title: "", description: "", story: "",
  objective: "", total: 1, sucatas: 0, xp: 0, rep: "", location: "",
  estimated_time: "", best_time_of_day: "", climate: "", environmental_risk: "Médio",
  expires_at: "", variant: "",
  image_url: "", success_rate: 50, active: true, faction_id: "",
}

/* ── Seção de contratos ── */
function ContratosSection() {
  const toast    = useToast()
  const { confirm } = useConfirm()
  const subpage  = useAdminSubpage()

  const [contracts, setContracts]   = useState<Contract[]>([])
  const [factions, setFactions]     = useState<Faction[]>([])
  const [loading, setLoading]       = useState(true)
  const [creatingNew, setCreatingNew] = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [editingContract, setEditingContract]   = useState<Contract | null>(null)
  const [editForm, setEditForm]     = useState({ ...emptyForm })
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditImg, setUploadingEditImg] = useState(false)
  const newImgRef  = useRef<HTMLInputElement>(null)
  const editImgRef = useRef<HTMLInputElement>(null)

  type ObjItem = { item_id: string; item_name: string; item_icon: string; qty: number }
  type ObjRewards = { sucatas: number; rep: number; items: ObjItem[] }
  type ObjRow = { text: string; desc: string; total: number; items: ObjItem[]; rewards: ObjRewards }
  const emptyObjRow = (): ObjRow => ({ text: "", desc: "", total: 1, items: [], rewards: { sucatas: 0, rep: 0, items: [] } })
  const [newObjectives, setNewObjectives]     = useState<ObjRow[]>([])
  const [editObjectives, setEditObjectives]   = useState<ObjRow[]>([])
  type PickerCtx = { objIdx: number; section: "deliver" | "reward" } | null
  const [objPickerCtx, setObjPickerCtx]       = useState<PickerCtx>(null)
  const [objItemQuery, setObjItemQuery]       = useState("")
  const [objItemResults, setObjItemResults]   = useState<any[]>([])
  const [objSearching, setObjSearching]       = useState(false)
  const [pendingNewFile, setPendingNewFile]   = useState<File | null>(null)
  const [uploadingNewImg, setUploadingNewImg] = useState(false)

  const CREATE_TABS = ["Básico", "Objetivos", "Imagem"] as const
  type CreateTab = typeof CREATE_TABS[number]
  const [createTab, setCreateTab] = useState<CreateTab>("Básico")

  const EDIT_TABS = ["Básico", "Objetivos", "Imagem"] as const
  type EditTab = typeof EDIT_TABS[number]
  const [editTab, setEditTab] = useState<EditTab>("Básico")

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

  async function uploadNewImage(contractId: string, file: File) {
    setUploadingNewImg(true)
    const fd = new FormData(); fd.append("file", file)
    const res  = await fetch(`/api/admin/contratos/${contractId}/image`, { method: "POST", body: fd })
    const body = await res.json().catch(() => ({}))
    setUploadingNewImg(false)
    if (!res.ok) toast.error("Erro ao enviar imagem.")
    return body.url as string | undefined
  }

  async function save() {
    if (!form.title || !form.objective) { setCreateTab("Básico"); return toast.error("Título e objetivo são obrigatórios.") }
    const expectedCount = MISSION_TYPES.find(t => t.value === form.mission_type)?.count ?? 1
    if (newObjectives.length !== expectedCount) {
      setCreateTab("Objetivos")
      return toast.error(`São necessários exatamente ${expectedCount} objetivo(s) para contratos ${MISSION_TYPES.find(t => t.value === form.mission_type)?.label ?? form.mission_type}.`)
    }
    const emptyObj = newObjectives.find(o => !o.text.trim())
    if (emptyObj) { setCreateTab("Objetivos"); return toast.error("Todos os objetivos precisam ter o campo Texto preenchido.") }
    const objSemItens = newObjectives.find(o => o.items.length === 0)
    if (objSemItens) { setCreateTab("Objetivos"); return toast.error("Cada objetivo precisa ter pelo menos 1 item para entregar.") }
    setSaving(true)
    const body = {
      ...form,
      rep: form.rep === "" ? null : Number(form.rep),
      expires_at: form.expires_at || null,
      variant: form.variant || null,
      faction_id: form.faction_id || null,
      image_url: form.image_url.startsWith("blob:") ? null : (form.image_url || null),
      objectives: newObjectives,
    }
    const res  = await fetch("/api/admin/contratos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setSaving(false); return toast.error(data.error ?? "Erro ao criar contrato.") }

    if (pendingNewFile) await uploadNewImage(data.id, pendingNewFile)

    setSaving(false)
    toast.success("Contrato criado!")
    setCreatingNew(false)
    subpage.clear()
    await load()
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/contratos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) })
    await load()
  }

  function openEdit(c: Contract) {
    const objs = (c.objectives as any[]) ?? []
    setEditObjectives(objs.map(o => ({
      text: o.text ?? "",
      desc: o.desc ?? "",
      total: o.total ?? 1,
      items: o.items ?? (o.item_id ? [{ item_id: o.item_id, item_name: o.item_name ?? "", item_icon: o.item_icon ?? "", qty: o.total ?? 1 }] : []),
      rewards: o.rewards ?? { sucatas: 0, rep: 0, items: [] },
    })))
    setObjPickerCtx(null)
    setEditTab("Básico")
    setEditForm({
      contract_type: c.contract_type ?? "comum",
      mission_type:  c.mission_type  ?? "diario",
      price_points:  c.price_points  ?? 0,
      price_real:    c.price_real    ?? 0,
      tier: c.tier, title: c.title, description: c.description, story: c.story ?? "",
      objective: c.objective, total: c.total, sucatas: c.sucatas, xp: c.xp,
      rep: c.rep != null ? String(c.rep) : "",
      location: c.location ?? "", estimated_time: c.estimated_time ?? "",
      best_time_of_day: c.best_time_of_day ?? "", climate: c.climate ?? "",
      environmental_risk: c.environmental_risk ?? "Médio",
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
      variant: c.variant ?? "", image_url: c.image_url ?? "",
      success_rate: c.success_rate ?? 50, active: c.active,
      faction_id: c.faction_id ?? "",
    })
    subpage.set(c.title, () => { setEditingContract(null); subpage.clear() })
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
      objectives: editObjectives,
    }
    const res = await fetch(`/api/admin/contratos/${editingContract.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    setSavingEdit(false)
    if (res.ok) {
      toast.success("Contrato salvo!")
      setEditingContract(null)
      subpage.clear()
      await load()
    } else toast.error("Erro ao salvar contrato.")
  }

  async function searchObjItem(q: string) {
    if (!q.trim()) { setObjItemResults([]); return }
    setObjSearching(true)
    const res = await fetch(`/api/admin/catalog?q=${encodeURIComponent(q)}&pageSize=6`)
    const body = await res.json().catch(() => ({}))
    setObjItemResults(body.items ?? [])
    setObjSearching(false)
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

      {/* ── Lista + formulário de criação (some quando editando) ── */}
      {!editingContract && !creatingNew && (<>
        <div className="utility-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Contratos</strong><small>Diários, Semanais e Mensais — comuns e de facção</small></div>
          <button type="button" onClick={() => {
            setForm(emptyForm); setNewObjectives([]); setCreateTab("Básico"); setPendingNewFile(null)
            subpage.set("Novo Contrato", () => { setCreatingNew(false); subpage.clear() })
            setCreatingNew(true)
          }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "7px 12px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            <Plus size={12} /> Novo Contrato
          </button>
        </div>

        {/* Lista de contratos */}
        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {contracts.map(c => {
              const fac = factions.find(f => f.id === c.faction_id)
              const mLabel = MISSION_TYPES.find(t => t.value === (c.mission_type ?? "diario"))?.label ?? c.mission_type
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid var(--stroke)", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                  onClick={() => openEdit(c)}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {c.image_url
                    ? <img src={c.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, width: 90 }}>
                    <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase", color: c.contract_type === "faccao" ? "var(--purple)" : "var(--gray-500)" }}>
                      {c.contract_type === "faccao" ? "Facção" : "Comum"}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 950, color: "var(--cyan)" }}>{mLabel?.split(" ")[0]}</span>
                  </div>
                  <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 950, color: "var(--paper)", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</p>
                  {fac
                    ? <span style={{ fontSize: 10, fontWeight: 950, color: fac.color, flexShrink: 0 }}>{fac.name}</span>
                    : <span style={{ fontSize: 10, color: "var(--gray-500)", flexShrink: 0 }}>—</span>}
                  <span style={{ fontSize: 11, whiteSpace: "nowrap", flexShrink: 0, color: "var(--yellow)" }}>{c.sucatas} pts
                    {c.xp > 0 && <span style={{ color: "var(--blue)", marginLeft: 6 }}>{c.xp} xp</span>}
                    {c.rep ? <span style={{ color: "#b477ff", marginLeft: 6 }}>{c.rep} rep</span> : null}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--gray-500)", flexShrink: 0, width: 70, textAlign: "right" }}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                  </span>
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
      </>)}

      {/* ── Criação com abas ── */}
      {creatingNew && (() => {
        const i: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "7px 10px", fontSize: 12, borderRadius: 6, font: "inherit", width: "100%", outline: "none" }
        const l: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }
        const mType        = form.mission_type ?? "diario"
        const expectedCount = MISSION_TYPES.find(t => t.value === mType)?.count ?? 1
        const atLimit       = newObjectives.length >= expectedCount

        return (
          <>
            {/* Cabeçalho */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--stroke)" }}>
              <button type="button" onClick={() => { setCreatingNew(false); subpage.clear() }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "6px 12px", fontSize: 11, fontWeight: 950, cursor: "pointer", borderRadius: 6, font: "inherit" }}>
                <ArrowLeft size={13} /> Contratos
              </button>
              {form.image_url && !form.image_url.startsWith("blob:")
                ? <img src={form.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
              <p style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 950, color: form.title ? "var(--paper)" : "var(--gray-500)" }}>
                {form.title || "Novo Contrato"}
              </p>
            </div>

            {/* Abas */}
            <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--stroke)", marginBottom: 20 }}>
              {CREATE_TABS.map(tab => {
                const objsOk = newObjectives.length === expectedCount && newObjectives.every(o => o.text.trim() !== "")
                const warn   = tab === "Objetivos" && !objsOk
                const active = createTab === tab
                return (
                  <button key={tab} type="button" onClick={() => setCreateTab(tab)}
                    style={{ padding: "8px 16px", fontSize: 12, fontWeight: 950, border: "none", borderBottom: `2px solid ${active ? "var(--cyan)" : "transparent"}`, background: "transparent", color: active ? "var(--cyan)" : warn ? "var(--yellow)" : "var(--gray-500)", cursor: "pointer", font: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                    {tab}{warn && <span style={{ fontSize: 9, background: "rgba(255,212,0,0.18)", color: "var(--yellow)", borderRadius: 3, padding: "1px 5px", fontWeight: 950 }}>{newObjectives.length}/{expectedCount}</span>}
                  </button>
                )
              })}
            </div>

            {/* Aba: Básico */}
            {createTab === "Básico" && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Tipo de contrato</span>
                    <select value={form.contract_type} onChange={e => field("contract_type", e.target.value)} style={i}>
                      {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Tipo de missão</span>
                    <select value={form.mission_type} onChange={e => field("mission_type", e.target.value)} style={i}>
                      {MISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Tier</span>
                    <select value={form.tier} onChange={e => field("tier", e.target.value)} style={i}>
                      {TIERS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Risco</span>
                    <select value={form.environmental_risk} onChange={e => field("environmental_risk", e.target.value)} style={i}>
                      {RISKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Variante</span>
                    <select value={form.variant} onChange={e => field("variant", e.target.value)} style={i}>
                      <option value="">Nenhuma</option>
                      <option value="dourada">Dourada</option>
                      <option value="holografica">Holográfica</option>
                      <option value="corrompida">Corrompida</option>
                    </select>
                  </label>
                  {form.contract_type === "faccao" ? (
                    <label><span style={l}>Facção *</span>
                      <select value={form.faction_id} onChange={e => field("faction_id", e.target.value)} style={i}>
                        <option value="">Selecionar...</option>
                        {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </label>
                  ) : <div />}
                  <label><span style={l}>Preço (Sucatas)</span>
                    <input type="number" min={0} value={form.price_points} onChange={e => field("price_points", Number(e.target.value))} style={i} placeholder="0 = gratuito" />
                  </label>
                  <label><span style={l}>Preço Real (R$)</span>
                    <input type="number" min={0} step={0.01} value={form.price_real} onChange={e => field("price_real", Number(e.target.value))} style={i} placeholder="0.00" />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label><span style={l}>Título *</span><input value={form.title} onChange={e => field("title", e.target.value)} style={i} placeholder="Semana da Guardia #1" /></label>
                  <label><span style={l}>Objetivo principal *</span><input value={form.objective} onChange={e => field("objective", e.target.value)} style={i} placeholder="Elimine 5 ARC Sentinel" /></label>
                </div>
                <label><span style={l}>Descrição curta</span><input value={form.description} onChange={e => field("description", e.target.value)} style={i} /></label>
                <label><span style={l}>História / briefing</span><textarea value={form.story} onChange={e => field("story", e.target.value)} rows={3} style={{ ...i, resize: "vertical" }} /></label>
                <label style={{ width: "fit-content" }}><span style={l}>Sucesso %</span><input type="number" min={0} max={100} value={form.success_rate} onChange={e => field("success_rate", Number(e.target.value))} style={{ ...i, width: 120 }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Localização</span><input value={form.location} onChange={e => field("location", e.target.value)} style={i} /></label>
                  <label><span style={l}>Tempo est.</span><input value={form.estimated_time} onChange={e => field("estimated_time", e.target.value)} style={i} placeholder="20-35 min" /></label>
                  <label><span style={l}>Melhor horário</span><input value={form.best_time_of_day} onChange={e => field("best_time_of_day", e.target.value)} style={i} /></label>
                  <label><span style={l}>Clima</span><input value={form.climate} onChange={e => field("climate", e.target.value)} style={i} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                </div>
                <label><span style={l}>Expira em</span><input type="datetime-local" value={form.expires_at} onChange={e => field("expires_at", e.target.value)} style={{ ...i, width: "auto" }} /></label>
              </div>
            )}

            {/* Aba: Objetivos */}
            {createTab === "Objetivos" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                  <span style={{ fontSize: 11, fontWeight: 950, color: newObjectives.length === expectedCount ? "var(--green)" : "var(--yellow)" }}>
                    {newObjectives.length}/{expectedCount} objetivos
                  </span>
                  {newObjectives.length !== expectedCount && (
                    <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                      {newObjectives.length < expectedCount
                        ? `Adicione mais ${expectedCount - newObjectives.length} objetivo(s)`
                        : `Remova ${newObjectives.length - expectedCount} para salvar`}
                    </span>
                  )}
                </div>
                {newObjectives.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum objetivo. Adicione abaixo.</p>
                )}
                {newObjectives.map((obj, idx) => {
                  const isPickingDeliver = objPickerCtx?.objIdx === idx && objPickerCtx?.section === "deliver"
                  const isPickingReward  = objPickerCtx?.objIdx === idx && objPickerCtx?.section === "reward"
                  const updObj = (fn: (o: ObjRow) => ObjRow) => setNewObjectives(p => p.map((o, k) => k === idx ? fn(o) : o))
                  return (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
                      {/* Cabeçalho: texto + desc + delete */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                        <label><span style={{ ...l, fontSize: 9 }}>Texto</span>
                          <input value={obj.text} onChange={e => updObj(o => ({ ...o, text: e.target.value }))} style={i} placeholder="Dia 1 — Entrega de materiais" />
                        </label>
                        <label><span style={{ ...l, fontSize: 9 }}>Descrição</span>
                          <input value={obj.desc} onChange={e => updObj(o => ({ ...o, desc: e.target.value }))} style={i} placeholder="Colete e entregue..." />
                        </label>
                        <button type="button" onClick={() => { setNewObjectives(p => p.filter((_, k) => k !== idx)); if (objPickerCtx?.objIdx === idx) setObjPickerCtx(null) }}
                          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: "4px 6px", opacity: 0.7, alignSelf: "flex-end", marginBottom: 1 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Itens para entregar */}
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--cyan)", letterSpacing: 1 }}>Itens para entregar</span>
                        {obj.items.map((item, ii) => (
                          <div key={ii} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {item.item_icon && <img src={item.item_icon} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                            <span style={{ flex: 1, fontSize: 11, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.item_name}</span>
                            <input type="number" min={1} value={item.qty}
                              onChange={e => updObj(o => ({ ...o, items: o.items.map((it, ij) => ij === ii ? { ...it, qty: Number(e.target.value) } : it) }))}
                              style={{ ...i, width: 65 }} />
                            <button type="button" onClick={() => updObj(o => ({ ...o, items: o.items.filter((_, ij) => ij !== ii) }))}
                              style={{ fontSize: 12, border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                        {isPickingDeliver && (
                          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--stroke)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                            <input autoFocus value={objItemQuery}
                              onChange={async e => { setObjItemQuery(e.target.value); await searchObjItem(e.target.value) }}
                              placeholder="Buscar item do catálogo..." style={{ ...i, fontSize: 11 }} />
                            {objSearching && <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Buscando...</span>}
                            {objItemResults.map((item: any) => (
                              <button key={item.id} type="button"
                                onClick={() => {
                                  updObj(o => ({ ...o, items: [...o.items, { item_id: item.id, item_name: item.name, item_icon: item.icon_url ?? "", qty: 1 }] }))
                                  setObjPickerCtx(null); setObjItemQuery(""); setObjItemResults([])
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "6px 10px", cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                                {item.icon_url && <img src={item.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                                <span style={{ flex: 1, fontSize: 11, color: "var(--paper)" }}>{item.name}</span>
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{item.rarity}</span>
                              </button>
                            ))}
                            <button type="button" onClick={() => setObjPickerCtx(null)}
                              style={{ fontSize: 10, border: "none", background: "none", color: "var(--gray-500)", cursor: "pointer", alignSelf: "flex-start", font: "inherit" }}>Cancelar</button>
                          </div>
                        )}
                        <button type="button" onClick={() => { setObjPickerCtx({ objIdx: idx, section: "deliver" }); setObjItemQuery(""); setObjItemResults([]) }}
                          style={{ fontSize: 11, border: "1px dashed rgba(0,217,255,0.3)", background: "transparent", color: "var(--cyan)", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                          + Adicionar item
                        </button>
                      </div>

                      {/* Recompensa ao concluir */}
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--green)", letterSpacing: 1 }}>Recompensa ao concluir</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label><span style={{ ...l, fontSize: 9, color: "var(--yellow)" }}>Sucatas</span>
                            <input type="number" min={0} value={obj.rewards.sucatas}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, sucatas: Number(e.target.value) } }))} style={i} />
                          </label>
                          <label><span style={{ ...l, fontSize: 9, color: "#b477ff" }}>Reputação</span>
                            <input type="number" min={0} value={obj.rewards.rep}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, rep: Number(e.target.value) } }))} style={i} />
                          </label>
                        </div>
                        {obj.rewards.items.map((item, ii) => (
                          <div key={ii} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {item.item_icon && <img src={item.item_icon} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                            <span style={{ flex: 1, fontSize: 11, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.item_name}</span>
                            <input type="number" min={1} value={item.qty}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, items: o.rewards.items.map((it, ij) => ij === ii ? { ...it, qty: Number(e.target.value) } : it) } }))}
                              style={{ ...i, width: 65 }} />
                            <button type="button" onClick={() => updObj(o => ({ ...o, rewards: { ...o.rewards, items: o.rewards.items.filter((_, ij) => ij !== ii) } }))}
                              style={{ fontSize: 12, border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                        {isPickingReward && (
                          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--stroke)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                            <input autoFocus value={objItemQuery}
                              onChange={async e => { setObjItemQuery(e.target.value); await searchObjItem(e.target.value) }}
                              placeholder="Buscar item do catálogo..." style={{ ...i, fontSize: 11 }} />
                            {objSearching && <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Buscando...</span>}
                            {objItemResults.map((item: any) => (
                              <button key={item.id} type="button"
                                onClick={() => {
                                  updObj(o => ({ ...o, rewards: { ...o.rewards, items: [...o.rewards.items, { item_id: item.id, item_name: item.name, item_icon: item.icon_url ?? "", qty: 1 }] } }))
                                  setObjPickerCtx(null); setObjItemQuery(""); setObjItemResults([])
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "6px 10px", cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                                {item.icon_url && <img src={item.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                                <span style={{ flex: 1, fontSize: 11, color: "var(--paper)" }}>{item.name}</span>
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{item.rarity}</span>
                              </button>
                            ))}
                            <button type="button" onClick={() => setObjPickerCtx(null)}
                              style={{ fontSize: 10, border: "none", background: "none", color: "var(--gray-500)", cursor: "pointer", alignSelf: "flex-start", font: "inherit" }}>Cancelar</button>
                          </div>
                        )}
                        <button type="button" onClick={() => { setObjPickerCtx({ objIdx: idx, section: "reward" }); setObjItemQuery(""); setObjItemResults([]) }}
                          style={{ fontSize: 11, border: "1px dashed rgba(61,242,139,0.3)", background: "transparent", color: "var(--green)", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                          + Adicionar item como recompensa
                        </button>
                      </div>
                    </div>
                  )
                })}
                {!atLimit && (
                  <button type="button"
                    onClick={() => setNewObjectives(p => [...p, emptyObjRow()])}
                    style={{ fontSize: 11, border: "1px dashed rgba(255,255,255,0.18)", background: "transparent", color: "var(--gray-500)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                    + Adicionar objetivo
                  </button>
                )}
              </div>
            )}

            {/* Aba: Imagem */}
            {createTab === "Imagem" && (
              <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
                <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {form.image_url
                    ? <img src={form.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Upload size={28} style={{ color: "var(--gray-500)" }} />}
                </div>
                <input ref={newImgRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setPendingNewFile(file)
                    field("image_url", URL.createObjectURL(file))
                  }} />
                <button type="button" onClick={() => newImgRef.current?.click()} disabled={uploadingNewImg}
                  style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, padding: "8px 16px", borderRadius: 6, cursor: "pointer", font: "inherit", opacity: uploadingNewImg ? 0.6 : 1 }}>
                  {uploadingNewImg ? "Enviando..." : "Selecionar arquivo"}
                </button>
                {pendingNewFile && (
                  <p style={{ margin: 0, fontSize: 11, color: "var(--yellow)" }}>
                    📎 {pendingNewFile.name} — será enviada ao criar o contrato
                  </p>
                )}
                <label><span style={l}>Ou cole uma URL</span>
                  <input value={form.image_url.startsWith("blob:") ? "" : form.image_url} onChange={e => { field("image_url", e.target.value); setPendingNewFile(null) }} placeholder="https://..." style={i} />
                </label>
              </div>
            )}

            {/* Botões */}
            <div style={{ display: "flex", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--stroke)" }}>
              <button type="button" onClick={() => { setCreatingNew(false); subpage.clear() }}
                style={{ border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, cursor: "pointer", borderRadius: 6, font: "inherit" }}>
                Cancelar
              </button>
              <button type="button" onClick={save} disabled={saving}
                style={{ border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "8px 20px", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, cursor: "pointer", borderRadius: 6, font: "inherit", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Criando..." : "✓ Criar Contrato"}
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Edição inline ── */}
      {editingContract && (() => {
        const ef  = editForm
        const set = (k: string, v: unknown) => setEditForm(p => ({ ...p, [k]: v }))
        const i: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "7px 10px", fontSize: 12, borderRadius: 6, font: "inherit", width: "100%", outline: "none" }
        const l: React.CSSProperties = { fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", display: "block", marginBottom: 4 }
        const mType        = ef.mission_type ?? "diario"
        const expectedCount = MISSION_TYPES.find(t => t.value === mType)?.count ?? 1
        const atLimit       = editObjectives.length >= expectedCount

        return (
          <>
            {/* Cabeçalho inline */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--stroke)" }}>
              <button type="button" onClick={() => { setEditingContract(null); subpage.clear() }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "6px 12px", fontSize: 11, fontWeight: 950, cursor: "pointer", borderRadius: 6, font: "inherit" }}>
                <ArrowLeft size={13} /> Contratos
              </button>
              {ef.image_url
                ? <img src={ef.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
              <p style={{ margin: 0, flex: 1, fontSize: 15, fontWeight: 950, color: "var(--paper)" }}>{ef.title || editingContract.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ToggleSwitch checked={ef.active} onChange={v => set("active", v)} />
                <span style={{ fontSize: 12, color: ef.active ? "var(--green)" : "var(--gray-500)" }}>{ef.active ? "Ativo" : "Inativo"}</span>
              </div>
            </div>

            {/* Abas */}
            <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--stroke)", marginBottom: 20 }}>
              {EDIT_TABS.map(tab => (
                <button key={tab} type="button"
                  onClick={() => setEditTab(tab)}
                  style={{ padding: "8px 16px", fontSize: 12, fontWeight: 950, border: "none", borderBottom: `2px solid ${editTab === tab ? "var(--cyan)" : "transparent"}`, background: "transparent", color: editTab === tab ? "var(--cyan)" : "var(--gray-500)", cursor: "pointer", font: "inherit" }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Aba: Básico */}
            {editTab === "Básico" && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Tipo de contrato</span>
                    <select value={ef.contract_type} onChange={e => set("contract_type", e.target.value)} style={i}>
                      {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Tipo de missão</span>
                    <select value={ef.mission_type} onChange={e => set("mission_type", e.target.value)} style={i}>
                      {MISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Tier</span>
                    <select value={ef.tier} onChange={e => set("tier", e.target.value)} style={i}>
                      {TIERS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label><span style={l}>Risco</span>
                    <select value={ef.environmental_risk} onChange={e => set("environmental_risk", e.target.value)} style={i}>
                      {RISKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Variante</span>
                    <select value={ef.variant} onChange={e => set("variant", e.target.value)} style={i}>
                      <option value="">Nenhuma</option>
                      <option value="dourada">Dourada</option>
                      <option value="holografica">Holográfica</option>
                      <option value="corrompida">Corrompida</option>
                    </select>
                  </label>
                  {ef.contract_type === "faccao" ? (
                    <label><span style={l}>Facção *</span>
                      <select value={ef.faction_id} onChange={e => set("faction_id", e.target.value)} style={i}>
                        <option value="">Selecionar...</option>
                        {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </label>
                  ) : <div />}
                  <label><span style={l}>Preço (Sucatas)</span>
                    <input type="number" min={0} value={ef.price_points} onChange={e => set("price_points", Number(e.target.value))} style={i} placeholder="0 = gratuito" />
                  </label>
                  <label><span style={l}>Preço Real (R$)</span>
                    <input type="number" min={0} step={0.01} value={ef.price_real} onChange={e => set("price_real", Number(e.target.value))} style={i} placeholder="0.00" />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <label><span style={l}>Título *</span><input value={ef.title} onChange={e => set("title", e.target.value)} style={i} /></label>
                  <label><span style={l}>Objetivo *</span><input value={ef.objective} onChange={e => set("objective", e.target.value)} style={i} /></label>
                </div>
                <label><span style={l}>Descrição</span><input value={ef.description} onChange={e => set("description", e.target.value)} style={i} /></label>
                <label><span style={l}>História / briefing</span><textarea value={ef.story} onChange={e => set("story", e.target.value)} rows={3} style={{ ...i, resize: "vertical" }} /></label>
                <label style={{ width: "fit-content" }}><span style={l}>Sucesso %</span><input type="number" min={0} max={100} value={ef.success_rate} onChange={e => set("success_rate", Number(e.target.value))} style={{ ...i, width: 120 }} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <label><span style={l}>Localização</span><input value={ef.location} onChange={e => set("location", e.target.value)} style={i} /></label>
                  <label><span style={l}>Tempo est.</span><input value={ef.estimated_time} onChange={e => set("estimated_time", e.target.value)} style={i} placeholder="20-35 min" /></label>
                  <label><span style={l}>Melhor horário</span><input value={ef.best_time_of_day} onChange={e => set("best_time_of_day", e.target.value)} style={i} /></label>
                  <label><span style={l}>Clima</span><input value={ef.climate} onChange={e => set("climate", e.target.value)} style={i} /></label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                </div>
                <label><span style={l}>Expira em</span><input type="datetime-local" value={ef.expires_at} onChange={e => set("expires_at", e.target.value)} style={{ ...i, width: "auto" }} /></label>
              </div>
            )}

            {/* Aba: Objetivos */}
            {editTab === "Objetivos" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--stroke)" }}>
                  <span style={{ fontSize: 11, fontWeight: 950, color: editObjectives.length === expectedCount ? "var(--green)" : "var(--yellow)" }}>
                    {editObjectives.length}/{expectedCount} objetivos
                  </span>
                  {editObjectives.length !== expectedCount && (
                    <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                      {editObjectives.length < expectedCount
                        ? `Adicione mais ${expectedCount - editObjectives.length} objetivo(s)`
                        : `Remova ${editObjectives.length - expectedCount} para salvar`}
                    </span>
                  )}
                </div>
                {editObjectives.length === 0 && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)" }}>Nenhum objetivo. Adicione abaixo.</p>
                )}
                {editObjectives.map((obj, idx) => {
                  const isPickingDeliver = objPickerCtx?.objIdx === idx && objPickerCtx?.section === "deliver"
                  const isPickingReward  = objPickerCtx?.objIdx === idx && objPickerCtx?.section === "reward"
                  const updObj = (fn: (o: ObjRow) => ObjRow) => setEditObjectives(p => p.map((o, k) => k === idx ? fn(o) : o))
                  return (
                    <div key={idx} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
                      {/* Cabeçalho: texto + desc + delete */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                        <label><span style={{ ...l, fontSize: 9 }}>Texto</span>
                          <input value={obj.text} onChange={e => updObj(o => ({ ...o, text: e.target.value }))} style={i} placeholder="Dia 1 — Entrega de materiais" />
                        </label>
                        <label><span style={{ ...l, fontSize: 9 }}>Descrição</span>
                          <input value={obj.desc} onChange={e => updObj(o => ({ ...o, desc: e.target.value }))} style={i} placeholder="Colete e entregue..." />
                        </label>
                        <button type="button" onClick={() => { setEditObjectives(p => p.filter((_, k) => k !== idx)); if (objPickerCtx?.objIdx === idx) setObjPickerCtx(null) }}
                          style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: "4px 6px", opacity: 0.7, alignSelf: "flex-end", marginBottom: 1 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Itens para entregar */}
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--cyan)", letterSpacing: 1 }}>Itens para entregar</span>
                        {obj.items.map((item, ii) => (
                          <div key={ii} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {item.item_icon && <img src={item.item_icon} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                            <span style={{ flex: 1, fontSize: 11, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.item_name}</span>
                            <input type="number" min={1} value={item.qty}
                              onChange={e => updObj(o => ({ ...o, items: o.items.map((it, ij) => ij === ii ? { ...it, qty: Number(e.target.value) } : it) }))}
                              style={{ ...i, width: 65 }} />
                            <button type="button" onClick={() => updObj(o => ({ ...o, items: o.items.filter((_, ij) => ij !== ii) }))}
                              style={{ fontSize: 12, border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                        {isPickingDeliver && (
                          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--stroke)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                            <input autoFocus value={objItemQuery}
                              onChange={async e => { setObjItemQuery(e.target.value); await searchObjItem(e.target.value) }}
                              placeholder="Buscar item do catálogo..." style={{ ...i, fontSize: 11 }} />
                            {objSearching && <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Buscando...</span>}
                            {objItemResults.map((item: any) => (
                              <button key={item.id} type="button"
                                onClick={() => {
                                  updObj(o => ({ ...o, items: [...o.items, { item_id: item.id, item_name: item.name, item_icon: item.icon_url ?? "", qty: 1 }] }))
                                  setObjPickerCtx(null); setObjItemQuery(""); setObjItemResults([])
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "6px 10px", cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                                {item.icon_url && <img src={item.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                                <span style={{ flex: 1, fontSize: 11, color: "var(--paper)" }}>{item.name}</span>
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{item.rarity}</span>
                              </button>
                            ))}
                            <button type="button" onClick={() => setObjPickerCtx(null)}
                              style={{ fontSize: 10, border: "none", background: "none", color: "var(--gray-500)", cursor: "pointer", alignSelf: "flex-start", font: "inherit" }}>Cancelar</button>
                          </div>
                        )}
                        <button type="button" onClick={() => { setObjPickerCtx({ objIdx: idx, section: "deliver" }); setObjItemQuery(""); setObjItemResults([]) }}
                          style={{ fontSize: 11, border: "1px dashed rgba(0,217,255,0.3)", background: "transparent", color: "var(--cyan)", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                          + Adicionar item
                        </button>
                      </div>

                      {/* Recompensa ao concluir */}
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 9, fontWeight: 950, textTransform: "uppercase" as const, color: "var(--green)", letterSpacing: 1 }}>Recompensa ao concluir</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <label><span style={{ ...l, fontSize: 9, color: "var(--yellow)" }}>Sucatas</span>
                            <input type="number" min={0} value={obj.rewards.sucatas}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, sucatas: Number(e.target.value) } }))} style={i} />
                          </label>
                          <label><span style={{ ...l, fontSize: 9, color: "#b477ff" }}>Reputação</span>
                            <input type="number" min={0} value={obj.rewards.rep}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, rep: Number(e.target.value) } }))} style={i} />
                          </label>
                        </div>
                        {obj.rewards.items.map((item, ii) => (
                          <div key={ii} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {item.item_icon && <img src={item.item_icon} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }} />}
                            <span style={{ flex: 1, fontSize: 11, color: "var(--paper)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{item.item_name}</span>
                            <input type="number" min={1} value={item.qty}
                              onChange={e => updObj(o => ({ ...o, rewards: { ...o.rewards, items: o.rewards.items.map((it, ij) => ij === ii ? { ...it, qty: Number(e.target.value) } : it) } }))}
                              style={{ ...i, width: 65 }} />
                            <button type="button" onClick={() => updObj(o => ({ ...o, rewards: { ...o.rewards, items: o.rewards.items.filter((_, ij) => ij !== ii) } }))}
                              style={{ fontSize: 12, border: "none", background: "none", color: "var(--red)", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                        {isPickingReward && (
                          <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--stroke)", borderRadius: 6, padding: 10, display: "grid", gap: 6 }}>
                            <input autoFocus value={objItemQuery}
                              onChange={async e => { setObjItemQuery(e.target.value); await searchObjItem(e.target.value) }}
                              placeholder="Buscar item do catálogo..." style={{ ...i, fontSize: 11 }} />
                            {objSearching && <span style={{ fontSize: 11, color: "var(--gray-500)" }}>Buscando...</span>}
                            {objItemResults.map((item: any) => (
                              <button key={item.id} type="button"
                                onClick={() => {
                                  updObj(o => ({ ...o, rewards: { ...o.rewards, items: [...o.rewards.items, { item_id: item.id, item_name: item.name, item_icon: item.icon_url ?? "", qty: 1 }] } }))
                                  setObjPickerCtx(null); setObjItemQuery(""); setObjItemResults([])
                                }}
                                style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "6px 10px", cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                                {item.icon_url && <img src={item.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                                <span style={{ flex: 1, fontSize: 11, color: "var(--paper)" }}>{item.name}</span>
                                <span style={{ fontSize: 10, color: "var(--gray-500)" }}>{item.rarity}</span>
                              </button>
                            ))}
                            <button type="button" onClick={() => setObjPickerCtx(null)}
                              style={{ fontSize: 10, border: "none", background: "none", color: "var(--gray-500)", cursor: "pointer", alignSelf: "flex-start", font: "inherit" }}>Cancelar</button>
                          </div>
                        )}
                        <button type="button" onClick={() => { setObjPickerCtx({ objIdx: idx, section: "reward" }); setObjItemQuery(""); setObjItemResults([]) }}
                          style={{ fontSize: 11, border: "1px dashed rgba(61,242,139,0.3)", background: "transparent", color: "var(--green)", padding: "5px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                          + Adicionar item como recompensa
                        </button>
                      </div>
                    </div>
                  )
                })}
                {!atLimit && (
                  <button type="button"
                    onClick={() => setEditObjectives(p => [...p, emptyObjRow()])}
                    style={{ fontSize: 11, border: "1px dashed rgba(255,255,255,0.18)", background: "transparent", color: "var(--gray-500)", padding: "6px 12px", borderRadius: 6, cursor: "pointer", font: "inherit", textAlign: "left" as const }}>
                    + Adicionar objetivo
                  </button>
                )}
              </div>
            )}

            {/* Aba: Imagem */}
            {editTab === "Imagem" && (
              <div style={{ display: "grid", gap: 16, maxWidth: 420 }}>
                <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid var(--stroke)", overflow: "hidden", display: "grid", placeItems: "center" }}>
                  {ef.image_url
                    ? <img src={ef.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <Upload size={28} style={{ color: "var(--gray-500)" }} />}
                </div>
                <input ref={editImgRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadEditImage(f) }} />
                <button type="button" onClick={() => editImgRef.current?.click()} disabled={uploadingEditImg}
                  style={{ border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, padding: "8px 16px", borderRadius: 6, cursor: "pointer", font: "inherit", opacity: uploadingEditImg ? 0.6 : 1 }}>
                  {uploadingEditImg ? "Enviando..." : "Selecionar arquivo"}
                </button>
                <label><span style={l}>Ou cole uma URL</span><input value={ef.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://..." style={i} /></label>
              </div>
            )}

            {/* Botões */}
            <div style={{ display: "flex", gap: 8, marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--stroke)" }}>
                <button type="button" onClick={() => { setEditingContract(null); subpage.clear() }}
                  style={{ border: "1px solid var(--stroke)", background: "transparent", color: "var(--gray-500)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, cursor: "pointer", borderRadius: 6, font: "inherit" }}>
                  Cancelar
                </button>
                <button type="button" onClick={saveEdit} disabled={savingEdit}
                  style={{ border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "8px 20px", fontSize: 11, fontWeight: 950, textTransform: "uppercase" as const, cursor: "pointer", borderRadius: 6, font: "inherit", opacity: savingEdit ? 0.6 : 1 }}>
                  {savingEdit ? "Salvando..." : "✓ Salvar"}
                </button>
              </div>
          </>
        )
      })()}
    </div>
  )
}

/* ── Seção unificada: contratos em andamento ── */
function ContratosAtivosSection() {
  const toast    = useToast()
  const { confirm } = useConfirm()
  const [data, setData]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/contratos/active-players")
    const body = await res.json().catch(() => ({}))
    setData(body.contracts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const MTYPE: Record<string, string> = { diario: "Diário", semanal: "Semanal", mensal: "Mensal" }

  async function confirmSchedule(scheduleId: string) {
    setConfirming(scheduleId)
    const res = await fetch(`/api/admin/contratos/schedules/${scheduleId}/confirm`, { method: "POST" })
    setConfirming(null)
    if (res.ok) {
      const body = await res.json()
      const pts  = body.sucatas_credited ?? 0
      toast.success(`✓ Entrega confirmada!${pts > 0 ? ` ${pts} pts creditados.` : ""}${body.all_done ? " Contrato concluído!" : ""}`)
      await load()
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? "Erro ao confirmar entrega.")
    }
  }

  async function cancelContract(ucId: string, userName: string, contractTitle: string) {
    const ok = await confirm(`Cancelar contrato "${contractTitle}" de ${userName}? O canal Discord será removido.`)
    if (!ok) return
    setCancelling(ucId)
    const res = await fetch(`/api/admin/contratos/acceptances/${ucId}/cancel`, { method: "POST" })
    setCancelling(null)
    if (res.ok) { toast.success("Contrato cancelado."); await load() }
    else toast.error("Erro ao cancelar contrato.")
  }

  return (
    <div className="utility-panel" style={{ marginBottom: 16 }}>
      <div className="utility-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Contratos em Andamento</strong>
          <small>Usuários com contratos ativos — agendamentos e confirmações de entrega</small>
        </div>
        <button type="button" onClick={load}
          style={{ fontSize: 11, border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper-dim)", padding: "4px 10px", borderRadius: 4, cursor: "pointer", font: "inherit" }}>
          ↻ Atualizar
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p>
      ) : data.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Nenhum contrato ativo no momento.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {data.map((contract: any) => (
            <div key={contract.id} style={{ border: "1px solid var(--stroke)", borderRadius: 10, overflow: "hidden" }}>
              {/* Cabeçalho do contrato */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--stroke)" }}>
                {contract.image_url && <img src={contract.image_url} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 950, color: "var(--paper)", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{contract.title}</p>
                  <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 950 }}>{MTYPE[contract.mission_type] ?? contract.mission_type}</span>
                  <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: 8 }}>{contract.tier}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--gray-500)", flexShrink: 0 }}>{contract.players.length} jogador(es)</span>
              </div>

              {/* Jogadores */}
              <div style={{ display: "grid", gap: 0 }}>
                {contract.players.map((player: any, pi: number) => {
                  const objProg   = (player.objectives_progress as Record<string, number>) ?? {}
                  const objectives = (contract.objectives as any[]) ?? []
                  const pendingScheds = (player.schedules as any[]).filter((s: any) => s.status === "scheduled")
                  const hasAction = pendingScheds.length > 0

                  return (
                    <div key={player.uc_id} style={{ padding: "12px 14px", borderBottom: pi < contract.players.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "grid", gap: 8 }}>
                      {/* Linha do jogador */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 950, color: "var(--paper)" }}>{player.user_name}</span>
                          <span style={{ fontSize: 10, color: "var(--gray-500)", marginLeft: 8 }}>
                            aceito em {new Date(player.accepted_at).toLocaleDateString("pt-BR")}
                          </span>
                          {player.discord_id && (
                            <span style={{ fontSize: 9, background: "rgba(88,101,242,0.2)", color: "#7289da", borderRadius: 3, padding: "1px 5px", marginLeft: 6, fontWeight: 950 }}>Discord</span>
                          )}
                        </div>
                        {/* Botão cancelar */}
                        <button type="button" onClick={() => cancelContract(player.uc_id, player.user_name, contract.title)}
                          disabled={cancelling === player.uc_id}
                          style={{ fontSize: 10, border: "1px solid rgba(255,80,80,0.35)", background: "rgba(255,80,80,0.06)", color: "var(--red)", padding: "4px 10px", borderRadius: 4, cursor: "pointer", font: "inherit", opacity: cancelling === player.uc_id ? 0.5 : 1, flexShrink: 0 }}>
                          {cancelling === player.uc_id ? "..." : "Cancelar"}
                        </button>
                      </div>

                      {/* Mini track de nodes */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {objectives.map((_: any, i: number) => {
                          const isDone  = (objProg[String(i)] ?? 0) >= 1
                          const sched   = (player.schedules as any[]).find((s: any) => s.objective_index === i && s.status === "scheduled")
                          const nodeCol = isDone ? "var(--green)" : sched ? "var(--yellow)" : "rgba(255,255,255,0.1)"
                          const lineCol = isDone && (objProg[String(i - 1)] ?? 0) >= 1 ? "var(--green)" : "rgba(255,255,255,0.08)"
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center" }}>
                              {i > 0 && <div style={{ width: objectives.length > 15 ? 6 : 10, height: 1.5, background: lineCol, flexShrink: 0 }} />}
                              <div title={`Step ${i + 1}${isDone ? " ✓ concluído" : sched ? " ⏳ agendado" : " pendente"}`}
                                style={{ width: objectives.length > 15 ? 9 : 12, height: objectives.length > 15 ? 9 : 12, borderRadius: "50%", background: nodeCol, border: `1.5px solid ${isDone ? "transparent" : sched ? "var(--yellow)" : "rgba(255,255,255,0.15)"}`, flexShrink: 0, transition: "background 0.2s" }} />
                            </div>
                          )
                        })}
                        <span style={{ marginLeft: 10, fontSize: 10, color: "var(--gray-500)" }}>
                          {Object.values(objProg).filter(v => v >= 1).length}/{objectives.length} steps
                        </span>
                      </div>

                      {/* Ações: confirmação dos agendamentos pendentes */}
                      {hasAction && (
                        <div style={{ display: "grid", gap: 5 }}>
                          {pendingScheds.map((sched: any) => {
                            const obj = objectives[sched.objective_index]
                            const isOverdue = sched.scheduled_at && new Date(sched.scheduled_at) < new Date()
                            const horario   = sched.scheduled_at
                              ? new Date(sched.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                              : "Sem horário"
                            return (
                              <div key={sched.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,212,0,0.06)", border: "1px solid rgba(255,212,0,0.2)", borderRadius: 6, padding: "6px 10px" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ fontSize: 11, color: "var(--yellow)", fontWeight: 950 }}>Step {sched.objective_index + 1}</span>
                                  {obj?.text && <span style={{ fontSize: 11, color: "var(--paper-dim)", marginLeft: 6 }}>{obj.text}</span>}
                                  <span style={{ fontSize: 10, color: isOverdue ? "var(--red)" : "var(--gray-500)", marginLeft: 8 }}>{horario}</span>
                                  {sched.game_id && <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--cyan)", marginLeft: 8 }}>{sched.game_id}</span>}
                                </div>
                                <button type="button" onClick={() => confirmSchedule(sched.id)} disabled={confirming === sched.id}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.08)", color: "var(--green)", padding: "5px 12px", fontSize: 10, fontWeight: 950, textTransform: "uppercase" as const, cursor: "pointer", borderRadius: 4, font: "inherit", opacity: confirming === sched.id ? 0.6 : 1, flexShrink: 0 }}>
                                  <CheckCircle size={11} /> {confirming === sched.id ? "..." : "Confirmar entrega"}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminContratosPage() {
  const { title } = useAdminSubpage()
  const editing   = title !== null
  return (
    <div>
      {!editing && <ContratosAtivosSection />}
      <ContratosSection />
      {!editing && <RewardsSection />}
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
                        {item.icon_url ? <img src={item.icon_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: "var(--gray-500)" }}>—</span>}
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
          <input type="number" min={1} value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ ...inp, width: 120 }} />
        </label>
      </div>

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
                        await fetch(`/api/admin/contratos/rewards/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ points_threshold: val }) })
                        await load()
                      }}
                      style={{ ...inp, width: 100, color: "var(--yellow)", fontWeight: 950 }} />
                  </td>
                  <td style={{ padding: "8px" }}>
                    <ToggleSwitch checked={r.active} onChange={async v => {
                      await fetch(`/api/admin/contratos/rewards/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: v }) })
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

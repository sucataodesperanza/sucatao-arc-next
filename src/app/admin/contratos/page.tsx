"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, Plus, Trash2, ChevronDown, ChevronUp, Upload } from "lucide-react"
import { useToast, useConfirm } from "@/components/admin-notifications"

type Contract = {
  id: string; type: string; tier: string; title: string; description: string
  objective: string; total: number; sucatas: number; xp: number; rep: number | null
  environmental_risk: string; expires_at: string | null; active: boolean
  image_url: string | null; variant: string | null
  location: string; estimated_time: string; best_time_of_day: string; climate: string
  story: string; bonus_condition: string; bonus_reward: string
  rewards: unknown[]; objectives: unknown[]; enemies: unknown[]
  success_rate: number; players_completed: number
  best_record_time: string; best_record_player: string
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
  const [saving, setSaving]           = useState(false)
  const [createdId, setCreatedId]     = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--stroke)", textAlign: "left" }}>
              {["Tipo","Tier","Título","Facção","Recompensas","Expira","Ativo",""].map(h => (
                <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "8px" }}><span style={{ fontSize: 10, fontWeight: 950, opacity: 0.7 }}>{c.type}</span></td>
                <td style={{ padding: "8px" }}><span style={{ fontSize: 10, fontWeight: 950 }}>{c.tier}</span></td>
                <td style={{ padding: "8px", fontWeight: 800 }}>{c.title}</td>
                <td style={{ padding: "8px" }}>
                  <select
                    value={(c as Contract & { faction_id?: string | null }).faction_id ?? ""}
                    onChange={async e => {
                      const val = e.target.value
                      await fetch(`/api/admin/contratos/${c.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ faction_id: val || null }),
                      })
                      await load()
                    }}
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: (c as Contract & { faction_id?: string | null }).faction_id ? factions.find(f => f.id === (c as Contract & { faction_id?: string | null }).faction_id)?.color ?? "var(--paper)" : "var(--gray-500)", padding: "4px 8px", fontSize: 11, fontWeight: 800, borderRadius: 4, font: "inherit", cursor: "pointer" }}
                  >
                    <option value="">— Sem facção</option>
                    {factions.map(f => (
                      <option key={f.id} value={f.id} style={{ color: "var(--paper)" }}>{f.name}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                  <span style={{ color: "var(--yellow)" }}>{c.sucatas} pts</span>
                  {c.xp > 0 && <span style={{ color: "var(--blue)", marginLeft: 6 }}>{c.xp} xp</span>}
                  {c.rep && <span style={{ color: "var(--purple)", marginLeft: 6 }}>{c.rep} rep</span>}
                </td>
                <td style={{ padding: "8px", color: "var(--muted)", fontSize: 11 }}>
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td style={{ padding: "8px" }}>
                  <input type="checkbox" checked={c.active} onChange={e => toggleActive(c.id, e.target.checked)} />
                </td>
                <td style={{ padding: "8px" }}>
                  <button type="button" onClick={() => del(c.id, c.title)}
                    style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", padding: 4, display: "flex" }}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhum contrato cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      )}
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

export default function AdminContratosPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>CONTRATOS</h1>
      </div>
      <ContratosSection />
      <AcceitancesSection />
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import arcData from "@/data/arc-data"
import { ARC_THREAT_ORDER, getArcThreatLabel, getArcTypeLabel, type ArcEntry } from "@/lib/arcpedia"
import { useToast } from "@/components/admin-notifications"

type LocalItem = { id: string; name: string }
const localItems = (arcData as unknown as { items: LocalItem[] }).items

function itemNameForId(id: string) { return localItems.find(i => i.id === id)?.name ?? id }
function itemIdForName(name: string) {
  const q = name.trim().toLowerCase()
  return localItems.find(i => i.name.toLowerCase() === q)?.id ?? null
}

function dropsToNames(ids: string[]) { return ids.map(itemNameForId).join(", ") }
function namesToIds(raw: string) {
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(itemIdForName).filter((id): id is string => id !== null)
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "13px", borderRadius: 4,
}

type FormState = {
  type: string
  threat: string
  weakness: string
  dropsText: string
}

function arcToForm(arc: ArcEntry): FormState {
  return {
    type: arc.type ?? "",
    threat: arc.threat ?? "",
    weakness: arc.weakness ?? "",
    dropsText: dropsToNames(arc.drops),
  }
}

export default function AdminArcpediaPage() {
  const toast = useToast()
  const [arcs, setArcs] = useState<ArcEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editing, setEditing] = useState<ArcEntry | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/arcpedia")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setArcs(body.arcs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    const res = await fetch("/api/admin/arcs/sync", { method: "POST" })
    const body = await res.json().catch(() => ({}))
    setSyncing(false)
    if (res.ok) {
      let msg = `Sincronizado! ${body.synced} ARCs atualizados.`
      if (body.translated) msg += ` ${body.translated} traduzidos automaticamente.`
      toast.success(msg)
      load()
    } else {
      toast.error(body.error ?? "Erro ao sincronizar.")
    }
  }

  function openEdit(arc: ArcEntry) {
    setEditing(arc)
    setForm(arcToForm(arc))
  }

  function closeEdit() {
    setEditing(null)
    setForm(null)
  }

  async function handleSave() {
    if (!editing || !form) return
    setSaving(true)

    const resolvedDrops = namesToIds(form.dropsText)
    const unknowns = form.dropsText.split(",").map(s => s.trim()).filter(Boolean)
      .filter(name => localItems.find(i => i.name.toLowerCase() === name.toLowerCase()) === undefined)

    const body = {
      type: form.type || null,
      threat: form.threat || null,
      weakness: form.weakness || null,
      drops: resolvedDrops,
    }

    const res = await fetch(`/api/admin/arcs/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      let msg = "Salvo!"
      if (unknowns.length > 0) msg += ` Drops não reconhecidos (ignorados): ${unknowns.join(", ")}`
      toast.success(msg)
      await load()
      closeEdit()
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? "Erro ao salvar.")
    }
  }

  return (
    <>
      <div className="utility-panel" style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={handleSync} disabled={syncing} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: syncing ? 0.6 : 1 }}>
          {syncing ? "Sincronizando..." : "Sincronizar com MetaForge"}
        </button>
      </div>

      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Arcpedia</strong>
          <small>{arcs.length} {arcs.length === 1 ? "ARC" : "ARCs"} — clique para editar</small>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}></th>
                  <th style={{ padding: "8px" }}>Nome</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Ameaça</th>
                  <th style={{ padding: "8px" }}>Fraqueza</th>
                  <th style={{ padding: "8px" }}>Drops</th>
                </tr>
              </thead>
              <tbody>
                {arcs.map(arc => (
                  <tr
                    key={arc.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onClick={() => openEdit(arc)}
                  >
                    <td style={{ padding: "8px" }}>
                      {arc.image ? <img src={arc.image} alt={arc.name} style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: 4 }} /> : null}
                    </td>
                    <td style={{ padding: "8px", fontWeight: 800 }}>{arc.name}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{arc.type ? getArcTypeLabel(arc.type) : <em style={{ opacity: 0.4 }}>—</em>}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{getArcThreatLabel(arc.threat)}</td>
                    <td style={{ padding: "8px", color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {arc.weakness ?? <em style={{ opacity: 0.4 }}>—</em>}
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{arc.drops.length > 0 ? arc.drops.length : <em style={{ opacity: 0.4 }}>—</em>}</td>
                  </tr>
                ))}
                {arcs.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum ARC. Clique em &quot;Sincronizar com MetaForge&quot; para popular a Arcpedia.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && form && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: 28, width: "min(520px, 100%)", display: "flex", flexDirection: "column", gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 16 }}>{editing.name}</strong>
              <button type="button" onClick={closeEdit} style={{ background: "none", border: "none", color: "var(--paper-dim)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Tipo</span>
              <input style={inputStyle} value={form.type} onChange={e => setForm(f => f ? { ...f, type: e.target.value } : f)} placeholder="Ex: Heavy Assault" />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Nível de ameaça</span>
              <select style={inputStyle} value={form.threat} onChange={e => setForm(f => f ? { ...f, threat: e.target.value } : f)}>
                <option value="">— Desconhecida —</option>
                {ARC_THREAT_ORDER.map(t => <option key={t} value={t}>{getArcThreatLabel(t)} ({t})</option>)}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Fraqueza</span>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.weakness} onChange={e => setForm(f => f ? { ...f, weakness: e.target.value } : f)} placeholder="Descreva a fraqueza do ARC..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Drops (nomes separados por vírgula)</span>
              <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} value={form.dropsText} onChange={e => setForm(f => f ? { ...f, dropsText: e.target.value } : f)} placeholder="Ex: Bateria ARC, Liga ARC, Circuito ARC" />
              <span style={{ fontSize: 10, color: "var(--gray-500)" }}>Use os nomes exatos dos itens do catálogo.</span>
            </label>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeEdit} style={btnStyle}>Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

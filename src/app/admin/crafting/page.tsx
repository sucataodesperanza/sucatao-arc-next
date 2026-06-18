"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Search, Trash2, X } from "lucide-react"
import arcData from "@/data/arc-data"
import type { AdminCatalogItem } from "@/app/api/admin/crafting/items/route"

type ArcItem = { id: string; name: string }
const allItemNames = [...new Set((arcData as unknown as { items: ArcItem[] }).items.map(i => i.name))]

type ItemSource = { qty: number; name: string }

const CATEGORY_LABELS: Record<string, string> = {
  all:       "Todos",
  materials: "Materiais",
  craftable: "Craftáveis",
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "13px", borderRadius: 4, font: "inherit",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase",
  cursor: "pointer", borderRadius: 4, font: "inherit",
}

function normalizeText(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

function fieldCount(item: AdminCatalogItem): number {
  let n = 0
  if (item.recipe && item.recipe.length > 0) n++
  if (item.obtained_from && item.obtained_from.length > 0) n++
  if (item.recycled_into && item.recycled_into.length > 0) n++
  if (item.recovered_into && item.recovered_into.length > 0) n++
  return n
}

/* ── Editor reutilizável para qualquer lista de { qty, name } ── */
function SourceEditor({
  label, rows, onChange, datalistId,
}: {
  label: string
  rows: ItemSource[]
  onChange: (rows: ItemSource[]) => void
  datalistId: string
}) {
  const lastRef = useRef<HTMLInputElement | null>(null)

  function add() {
    onChange([...rows, { qty: 1, name: "" }])
    setTimeout(() => lastRef.current?.focus(), 30)
  }

  function remove(i: number) {
    const next = rows.filter((_, idx) => idx !== i)
    onChange(next.length > 0 ? next : [])
  }

  function updateQty(i: number, val: string) {
    const qty = Math.max(1, parseInt(val, 10) || 1)
    onChange(rows.map((r, idx) => idx === i ? { ...r, qty } : r))
  }

  function updateName(i: number, name: string) {
    onChange(rows.map((r, idx) => idx === i ? { ...r, name } : r))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>
        {label}
      </span>

      {rows.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--gray-500)", fontStyle: "italic" }}>
          Nenhum registro — clique em Adicionar para começar.
        </p>
      )}

      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number" min={1} max={999} value={row.qty}
            onChange={e => updateQty(i, e.target.value)}
            style={{ ...inputStyle, width: 58, textAlign: "center", flexShrink: 0 }}
            aria-label="Quantidade"
          />
          <span style={{ color: "var(--gray-500)", fontSize: 13, flexShrink: 0 }}>×</span>
          <input
            ref={i === rows.length - 1 ? lastRef : null}
            type="text" value={row.name}
            onChange={e => updateName(i, e.target.value)}
            list={datalistId}
            placeholder="Nome do item..."
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            aria-label="Nome do item"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add() } }}
          />
          <button
            type="button" onClick={() => remove(i)} title="Remover"
            style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 6, display: "flex", alignItems: "center", flexShrink: 0 }}
            aria-label="Remover"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button" onClick={add}
        style={{ ...btnStyle, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 2 }}
      >
        <Plus size={12} /> Adicionar
      </button>
    </div>
  )
}

/* ── Página principal ── */
export default function AdminCraftingPage() {
  const [items, setItems] = useState<AdminCatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState<"all" | "materials" | "craftable">("all")
  const [search, setSearch] = useState("")

  const [editing, setEditing] = useState<AdminCatalogItem | null>(null)
  const [recipe, setRecipe] = useState<ItemSource[]>([])
  const [obtainedFrom, setObtainedFrom] = useState<ItemSource[]>([])
  const [recycledInto, setRecycledInto] = useState<ItemSource[]>([])
  const [recoveredInto, setRecoveredInto] = useState<ItemSource[]>([])
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/crafting/items?category=${category}`)
    const body = await res.json().catch(() => ({}))
    if (res.ok) setItems(body.items ?? [])
    setLoading(false)
  }, [category])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = normalizeText(search)
    return items.filter(i => normalizeText(i.name).includes(q))
  }, [items, search])

  function openEdit(item: AdminCatalogItem) {
    setEditing(item)
    setRecipe(item.recipe?.length ? item.recipe : [])
    setObtainedFrom(item.obtained_from?.length ? item.obtained_from : [])
    setRecycledInto(item.recycled_into?.length ? item.recycled_into : [])
    setRecoveredInto(item.recovered_into?.length ? item.recovered_into : [])
    setSaveStatus("")
  }

  function closeEdit() {
    setEditing(null)
    setSaveStatus("")
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setSaveStatus("")

    const cleanList = (arr: ItemSource[]) => arr.filter(r => r.name.trim()).map(r => ({ qty: r.qty, name: r.name.trim() }))

    const body: Record<string, unknown> = {
      obtained_from:  cleanList(obtainedFrom),
      recycled_into:  cleanList(recycledInto),
      recovered_into: cleanList(recoveredInto),
    }
    if (editing.workbench) {
      body.recipe = cleanList(recipe).length > 0 ? cleanList(recipe) : null
    }

    const res = await fetch(`/api/admin/catalog/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      setSaveStatus("Salvo!")
      await load()
      closeEdit()
    } else {
      const err = await res.json().catch(() => ({}))
      setSaveStatus(err.error ?? "Erro ao salvar.")
    }
  }

  return (
    <>
      {/* Datalist para autocomplete */}
      <datalist id="admin-item-names">
        {allItemNames.map(n => <option key={n} value={n} />)}
      </datalist>

      <div className="utility-panel">
        {/* Cabeçalho */}
        <div className="utility-panel-head">
          <strong>Itens do Catálogo</strong>
          <small>Use o sync do catálogo principal para importar/atualizar itens</small>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
            {(["all", "materials", "craftable"] as const).map(cat => (
              <button
                key={cat} type="button"
                onClick={() => setCategory(cat)}
                style={{
                  ...btnStyle,
                  border: "none",
                  borderRadius: 0,
                  background: category === cat ? "rgba(0,217,255,0.12)" : "rgba(255,255,255,0.03)",
                  color: category === cat ? "var(--cyan)" : "var(--gray-500)",
                  borderRight: cat !== "craftable" ? "1px solid var(--line)" : "none",
                }}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180, border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px", background: "rgba(0,0,0,0.2)" }}>
            <Search size={13} style={{ color: "var(--gray-500)", flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Buscar por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: "none", border: "none", color: "var(--text)", fontSize: 13, outline: "none", flex: 1, padding: "8px 0", font: "inherit" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: 2, display: "flex" }}>
                <X size={13} />
              </button>
            )}
          </div>

          <span style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 800, flexShrink: 0 }}>
            {filtered.length} {filtered.length === 1 ? "item" : "itens"}
          </span>
        </div>

        {/* Tabela */}
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px", width: 40 }}></th>
                  <th style={{ padding: "8px" }}>Nome</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Bancada</th>
                  <th style={{ padding: "8px" }}>Campos</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const fc = fieldCount(item)
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                      onClick={() => openEdit(item)}
                    >
                      <td style={{ padding: "6px 8px" }}>
                        {item.icon_url && <img src={item.icon_url} alt={item.name} style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 4 }} />}
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 800 }}>{item.name}</td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{item.item_type ?? "—"}</td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)" }}>
                        {item.workbench ?? <em style={{ opacity: 0.4 }}>—</em>}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {fc > 0
                          ? <span style={{ color: "var(--cyan)" }}>{fc} campo{fc !== 1 ? "s" : ""}</span>
                          : <em style={{ opacity: 0.4 }}>Sem dados</em>}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                      Nenhum item encontrado. Sincronize o catálogo principal para importar itens.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div
            style={{ background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: 28, width: "min(600px, 100%)", maxHeight: "min(90vh, 800px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {editing.icon_url && <img src={editing.icon_url} alt={editing.name} style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6, background: "rgba(255,255,255,0.05)", padding: 4 }} />}
                <div>
                  <strong style={{ fontSize: 15, display: "block" }}>{editing.name}</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>{editing.item_type ?? ""}{editing.workbench ? ` · ${editing.workbench}` : ""}</span>
                </div>
              </div>
              <button type="button" onClick={closeEdit} style={{ background: "none", border: "none", color: "var(--paper-dim)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>

            {/* Receita de crafting (só para itens com bancada) */}
            {editing.workbench && (
              <SourceEditor
                label="Receita de crafting (ingredientes)"
                rows={recipe}
                onChange={setRecipe}
                datalistId="admin-item-names"
              />
            )}

            {/* Pode ser obtido de */}
            <SourceEditor
              label="Pode ser obtido de (qtd × item fonte)"
              rows={obtainedFrom}
              onChange={setObtainedFrom}
              datalistId="admin-item-names"
            />

            {/* Reciclado em */}
            <SourceEditor
              label="Reciclado em (qtd × item resultado)"
              rows={recycledInto}
              onChange={setRecycledInto}
              datalistId="admin-item-names"
            />

            {/* Recuperado em */}
            <SourceEditor
              label="Recuperado em (qtd × item resultado)"
              rows={recoveredInto}
              onChange={setRecoveredInto}
              datalistId="admin-item-names"
            />

            {saveStatus && (
              <p style={{ fontSize: 12, color: saveStatus.startsWith("Salvo") ? "var(--green)" : "var(--red)", margin: 0 }}>
                {saveStatus}
              </p>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={closeEdit} style={btnStyle}>Cancelar</button>
              <button
                type="button" onClick={handleSave} disabled={saving}
                style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

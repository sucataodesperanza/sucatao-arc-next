"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import arcData from "@/data/arc-data"
import type { CraftingItem, RecipeIngredient } from "@/app/api/crafting/route"

type ArcItem = { id: string; name: string }
const allItemNames = [...new Set((arcData as unknown as { items: ArcItem[] }).items.map(i => i.name))]

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "13px", borderRadius: 4,
}

export default function AdminCraftingPage() {
  const [items, setItems] = useState<CraftingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<CraftingItem | null>(null)
  const [rows, setRows] = useState<RecipeIngredient[]>([])
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const lastNameRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/crafting")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setItems(body.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openEdit(item: CraftingItem) {
    setEditing(item)
    setRows(item.recipe && item.recipe.length > 0 ? item.recipe : [{ qty: 1, name: "" }])
    setSaveStatus("")
  }

  function closeEdit() {
    setEditing(null)
    setSaveStatus("")
  }

  function addRow() {
    setRows(prev => [...prev, { qty: 1, name: "" }])
    setTimeout(() => lastNameRef.current?.focus(), 30)
  }

  function removeRow(i: number) {
    setRows(prev => {
      const next = prev.filter((_, idx) => idx !== i)
      return next.length > 0 ? next : [{ qty: 1, name: "" }]
    })
  }

  function updateQty(i: number, val: string) {
    const qty = Math.max(1, parseInt(val, 10) || 1)
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, qty } : r))
  }

  function updateName(i: number, name: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, name } : r))
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setSaveStatus("")

    const recipe = rows.filter(r => r.name.trim()).map(r => ({ qty: r.qty, name: r.name.trim() }))

    const res = await fetch(`/api/admin/catalog/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: recipe.length > 0 ? recipe : null }),
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

  const validRows = rows.filter(r => r.name.trim())

  return (
    <>
      <datalist id="crafting-item-names">
        {allItemNames.map(name => <option key={name} value={name} />)}
      </datalist>

      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Receitas de Crafting</strong>
          <small>{items.length} {items.length === 1 ? "item" : "itens"} — clique para editar receita</small>
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
                  <th style={{ padding: "8px" }}>Bancada</th>
                  <th style={{ padding: "8px" }}>Ingredientes</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onClick={() => openEdit(item)}
                  >
                    <td style={{ padding: "8px" }}>
                      {item.icon_url && <img src={item.icon_url} alt={item.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />}
                    </td>
                    <td style={{ padding: "8px", fontWeight: 800 }}>{item.name}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{item.workbench ?? <em style={{ opacity: 0.4 }}>—</em>}</td>
                    <td style={{ padding: "8px" }}>
                      {item.recipe && item.recipe.length > 0
                        ? <span style={{ color: "var(--cyan)" }}>{item.recipe.length} ingrediente{item.recipe.length !== 1 ? "s" : ""}</span>
                        : <em style={{ opacity: 0.4 }}>Sem receita</em>}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                      Nenhum item craftável. Sincronize o catálogo primeiro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div
            style={{ background: "var(--surface-2)", border: "1px solid var(--stroke)", borderRadius: 12, padding: 28, width: "min(540px, 100%)", display: "flex", flexDirection: "column", gap: 20 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {editing.icon_url && <img src={editing.icon_url} alt={editing.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />}
                <div>
                  <strong style={{ fontSize: 16, display: "block" }}>{editing.name}</strong>
                  {editing.workbench && <span style={{ fontSize: 11, color: "var(--cyan)", fontWeight: 800 }}>{editing.workbench}</span>}
                </div>
              </div>
              <button type="button" onClick={closeEdit} style={{ background: "none", border: "none", color: "var(--paper-dim)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
            </div>

            {/* Ingredient rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Ingredientes</span>

              {rows.map((row, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={row.qty}
                    onChange={e => updateQty(i, e.target.value)}
                    style={{ ...inputStyle, width: 58, textAlign: "center", flexShrink: 0 }}
                    aria-label="Quantidade"
                  />
                  <span style={{ color: "var(--gray-500)", fontSize: 13, flexShrink: 0 }}>×</span>
                  <input
                    ref={i === rows.length - 1 ? lastNameRef : null}
                    type="text"
                    value={row.name}
                    onChange={e => updateName(i, e.target.value)}
                    list="crafting-item-names"
                    placeholder="Nome do item..."
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    aria-label="Nome do ingrediente"
                    onKeyDown={e => {
                      if (e.key === "Enter") { e.preventDefault(); addRow() }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    title="Remover"
                    style={{ background: "none", border: "none", color: "var(--gray-500)", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", flexShrink: 0 }}
                    aria-label="Remover ingrediente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 2 }}
              >
                <Plus size={12} />
                Adicionar ingrediente
              </button>
            </div>

            {saveStatus && (
              <p style={{ fontSize: 12, color: saveStatus.startsWith("Salvo") ? "var(--green)" : "var(--red)", margin: 0 }}>
                {saveStatus}
              </p>
            )}

            {/* Footer */}
            <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                {validRows.length > 0 ? `${validRows.length} ingrediente${validRows.length !== 1 ? "s" : ""}` : "Nenhum ingrediente"}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={closeEdit} style={btnStyle}>Cancelar</button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Salvando..." : "Salvar receita"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

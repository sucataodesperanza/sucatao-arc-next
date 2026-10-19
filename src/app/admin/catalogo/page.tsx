"use client"

import { useEffect, useState, useCallback } from "react"
import { getItemTypeLabel, getRarityLabel } from "@/lib/catalog"
import { useToast } from "@/components/admin-notifications"
import "../../../styles/admin-catalogo.css"

type AdminCatalogItem = {
  id: string
  name: string
  name_en: string | null
  item_type: string | null
  rarity: string | null
  icon_url: string | null
  active: boolean
  synced_at: string | null
}

const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"]
const TYPES = [
  "Advanced Material", "Ammunition", "Augment", "Basic Material", "Blueprint", "Consumable",
  "Cosmetic", "Deployable", "Design", "Gadget", "Key", "Material", "Misc", "Modification", "Nature",
  "Quest Item", "Quick Use", "Recyclable", "Refined Material", "Research", "Shield", "Stencil", "Throwable",
  "Topside Material", "Trinket", "Weapon",
]

const PAGE_SIZE = 20

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "12px",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

export default function AdminCatalogoPage() {
  const [items, setItems] = useState<AdminCatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [rarity, setRarity] = useState("all")
  const [type, setType] = useState("all")
  const [availableTypes, setAvailableTypes] = useState<string[]>(TYPES)
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/admin/catalog/types", {cache:"no-store",signal:controller.signal})
      .then(async response => { if(!response.ok) return; const body=await response.json(); if(Array.isArray(body.types)) setAvailableTypes(body.types.filter((value:unknown):value is string=>typeof value === "string")) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)
    if (rarity !== "all") params.set("rarity", rarity)
    if (type !== "all") params.set("type", type)

    const res = await fetch(`/api/admin/catalog?${params.toString()}`, { cache: "no-store" })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setItems(body.items ?? [])
      setTotal(body.total ?? 0)
    }
    setLoading(false)
  }, [page, q, rarity, type])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    const res = await fetch("/api/admin/catalog/sync", { method: "POST" })
    const body = await res.json().catch(() => ({}))
    setSyncing(false)
    if (res.ok) {
      let msg = `Sincronizado! ${body.synced} itens atualizados.`
      if (body.translated) msg += ` ${body.translated} traduzidos automaticamente.`
      toast.success(msg)
      load()
    } else {
      toast.error(body.error ?? "Erro ao sincronizar.")
    }
  }

  async function patchItem(id: string, patch: Record<string, unknown>) {
    setSavingId(id)
    try {
    const res = await fetch(`/api/admin/catalog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } as AdminCatalogItem : it))
      if ("active" in patch) toast.success(patch.active ? "Item ativado!" : "Item desativado.")
      else toast.success("Salvo!")
      return true
    } else {
      const body = await res.json().catch(()=>({}))
      toast.error(body.error ?? "Erro ao salvar.")
      return false
    }
    } catch { toast.error("Não foi possível salvar. Confira a conexão e tente novamente."); return false }
    finally { setSavingId(null) }
  }

  function startEditName(item: AdminCatalogItem) {
    setEditingId(item.id)
    setEditingName(item.name)
  }

  async function commitName(id: string) {
    const name = editingName.trim()
    if (!name) { toast.error("Informe o nome em português."); return }
    const original = items.find(i => i.id === id)?.name
    if (name === original) { setEditingId(null); return }
    if (await patchItem(id, { name })) setEditingId(null)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="utility-panel" style={{marginBottom:16}}><h1 style={{fontSize:22}}>Catálogo e traduções</h1><p style={{color:"var(--muted)",fontSize:13}}>Busque pelo nome em português ou inglês e clique em Editar nome. As alterações manuais serão preservadas ao sincronizar com o MetaForge.</p></div>
      <div className="utility-panel" style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Buscar por nome em português ou inglês..."
          value={q}
          onChange={e => { setPage(1); setQ(e.target.value) }}
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
        <select value={rarity} onChange={e => { setPage(1); setRarity(e.target.value) }} style={inputStyle}>
          <option value="all">Todas as raridades</option>
          {RARITIES.map(r => <option key={r} value={r}>{getRarityLabel(r)}</option>)}
        </select>
        <select value={type} onChange={e => { setPage(1); setType(e.target.value) }} style={inputStyle}>
          <option value="all">Todos os tipos</option>
          {availableTypes.map(t => <option key={t} value={t}>{getItemTypeLabel(t)}</option>)}
        </select>
        <button type="button" onClick={handleSync} disabled={syncing || savingId !== null || editingId !== null} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: syncing ? 0.6 : 1 }}>
          {syncing ? "Sincronizando..." : "Sincronizar com MetaForge"}
        </button>
      </div>

      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Catálogo de itens</strong>
          <small>{total} {total === 1 ? "item" : "itens"}</small>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}></th>
                  <th style={{ padding: "8px" }}>Nome em português</th>
                  <th style={{ padding: "8px" }}>Original em inglês</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Raridade</th>
                  <th style={{ padding: "8px" }}>Ativo</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px" }}>
                      {item.icon_url ? (
                        <img src={item.icon_url} alt={item.name} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                      ) : null}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {editingId === item.id ? (
                        <div><input
                          autoFocus
                          aria-label={`Nome em português de ${item.name_en || item.name}`}
                          maxLength={200}
                          disabled={savingId === item.id}
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !savingId) { e.preventDefault(); commitName(item.id) }
                            if (e.key === "Escape" && !savingId) setEditingId(null)
                          }}
                          style={{ ...inputStyle, width: "100%", fontWeight: 800 }}
                        /><div style={{display:"flex",gap:8,marginTop:8}}><button type="button" style={btnStyle} disabled={savingId!==null} onClick={()=>commitName(item.id)}>{savingId===item.id?"Salvando…":"Salvar"}</button><button type="button" style={btnStyle} disabled={savingId!==null} onClick={()=>setEditingId(null)}>Cancelar</button></div></div>
                      ) : (
                        <div><strong style={{display:"block",marginBottom:8}}>{item.name}</strong><button type="button" disabled={savingId!==null || syncing} style={btnStyle} onClick={()=>startEditName(item)}>Editar nome</button></div>
                      )}
                    </td>
                    <td style={{padding:8,color:"var(--muted)"}}>{item.name_en || "Não informado"}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{getItemTypeLabel(item.item_type)}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{getRarityLabel(item.rarity)}</td>
                    <td style={{ padding: "8px" }}>
                      <input type="checkbox" aria-label={`Ativar ${item.name}`} disabled={savingId!==null || syncing} checked={item.active} onChange={e => patchItem(item.id, { active: e.target.checked })} />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum item encontrado. Clique em &quot;Sincronizar com MetaForge&quot; para popular o catálogo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ ...btnStyle, opacity: page <= 1 ? 0.4 : 1 }}>Anterior</button>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Página {page} de {totalPages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ ...btnStyle, opacity: page >= totalPages ? 0.4 : 1 }}>Próxima</button>
        </div>
      </div>
    </>
  )
}

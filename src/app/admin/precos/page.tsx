"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, TrendingUp, Package, Zap, Filter } from "lucide-react"
import { useToast } from "@/components/admin-notifications"

type StockItem = {
  catalog_item_id: string
  value: number
  price_points: number
  price_cash: number
  quantity: number
  catalog_items: { name: string; rarity: string | null; item_type: string | null; icon_url: string | null } | null
  vei?: number
  suggested_points?: number
  suggested_cash?: number
}

const RARITY_COLORS: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400",
}

export default function AdminPrecosPage() {
  const toast = useToast()
  const [items, setItems]               = useState<StockItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [applying, setApplying]         = useState(false)
  const [bulkAdding, setBulkAdding]     = useState(false)
  const [editingItem, setEditingItem]   = useState<StockItem | null>(null)
  const [editForm, setEditForm]         = useState({ price_points: 0, price_cash: 0 })
  const [savingEdit, setSavingEdit]     = useState(false)
  const [settings, setSettings]         = useState({ points_multiplier: 100, cash_multiplier: 0.10 })
  const [savingSettings, setSavingSettings] = useState(false)
  const [filterRarity, setFilterRarity] = useState("")
  const [filterType, setFilterType]     = useState("")
  const [filterVei, setFilterVei]       = useState("")
  const [search, setSearch]             = useState("")
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(50)

  const load = useCallback(async () => {
    setLoading(true)
    const [stockRes, settingsRes, veiRes] = await Promise.all([
      // Busca todos os itens do estoque em múltiplas páginas
      (async () => {
        const all: any[] = []
        let pg = 1
        while (true) {
          const r = await fetch(`/api/admin/stock?pageSize=2000&page=${pg}`).then(r => r.json()).catch(() => ({ items: [], total: 0 }))
          all.push(...(r.items ?? []))
          if (all.length >= (r.total ?? 0) || !(r.items?.length)) break
          pg++
        }
        return { items: all }
      })(),
      fetch("/api/admin/economia/settings").then(r => r.json()).catch(() => ({ points_multiplier: 100, cash_multiplier: 0.10 })),
      fetch("/api/admin/economia/vei-list").then(r => r.json()).catch(() => ({ data: [] })),
    ])
    setSettings({ points_multiplier: Number(settingsRes.points_multiplier ?? 100), cash_multiplier: Number(settingsRes.cash_multiplier ?? 0.10) })
    const veiMap: Record<string, number> = {}
    for (const v of veiRes.data ?? []) veiMap[v.item_id] = Number(v.vei)
    const pm = Number(settingsRes.points_multiplier ?? 100)
    const cm = Number(settingsRes.cash_multiplier   ?? 0.10)
    const enriched = (stockRes.items ?? []).map((s: StockItem) => {
      const vei = veiMap[s.catalog_item_id] ?? 0
      return { ...s, vei, suggested_points: Math.max(1, Math.round(vei * pm)), suggested_cash: Math.max(0.01, parseFloat((vei * cm).toFixed(2))) }
    })
    setItems(enriched)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveSettings() {
    setSavingSettings(true)
    await fetch("/api/admin/economia/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) })
    setSavingSettings(false)
    toast.success("Multiplicadores salvos!")
    await load()
  }

  async function bulkAdd() {
    setBulkAdding(true)
    const res = await fetch("/api/admin/stock/bulk-add", { method: "POST" })
    setBulkAdding(false)
    if (res.ok) { const body = await res.json(); toast.success(`${body.added} itens adicionados ao estoque!`); await load() }
    else toast.error("Erro ao adicionar itens.")
  }

  async function applyVei(ids?: string[]) {
    setApplying(true)
    const body = ids?.length ? { item_ids: ids } : {}
    const res = await fetch("/api/admin/stock/apply-vei", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setApplying(false)
    if (res.ok) { const b = await res.json(); toast.success(`Preços VEI aplicados em ${b.updated} itens!`); setSelectedIds(new Set()); await load() }
    else toast.error("Erro ao aplicar preços VEI.")
  }

  async function updatePrice(itemId: string, field: "price_points" | "price_cash", value: number) {
    await fetch(`/api/admin/stock/${itemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) })
    await load()
  }

  function openEdit(item: StockItem) {
    setEditingItem(item)
    setEditForm({ price_points: item.price_points, price_cash: item.price_cash })
  }

  async function saveEdit() {
    if (!editingItem) return
    setSavingEdit(true)
    const res = await fetch(`/api/admin/stock/${editingItem.catalog_item_id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price_points: editForm.price_points, price_cash: editForm.price_cash }),
    })
    setSavingEdit(false)
    if (res.ok) {
      toast.success("Preços salvos!")
      setEditingItem(null)
      await load()
    } else {
      toast.error("Erro ao salvar preços.")
    }
  }

  // Filtros
  const rarities  = [...new Set(items.map(i => i.catalog_items?.rarity).filter(Boolean))]
  const types     = [...new Set(items.map(i => i.catalog_items?.item_type).filter(Boolean))]
  const filtered  = items.filter(i => {
    if (filterRarity && i.catalog_items?.rarity !== filterRarity) return false
    if (filterType   && i.catalog_items?.item_type !== filterType) return false
    if (search && !i.catalog_items?.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterVei === "low"  && (i.vei ?? 0) >= 40)  return false
    if (filterVei === "mid"  && ((i.vei ?? 0) < 40 || (i.vei ?? 0) >= 70)) return false
    if (filterVei === "high" && (i.vei ?? 0) < 70)  return false
    return true
  })

  // Resetar página ao mudar filtros ou page size
  useEffect(() => setPage(1), [filterRarity, filterType, filterVei, search, pageSize])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pagedItems  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const priceDiff = (curr: number, sug: number) => sug > 0 ? Math.round(((curr - sug) / sug) * 100) : 0

  const sel: React.CSSProperties = { background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "6px 10px", fontSize: 12, borderRadius: 4, font: "inherit" }
  const inp: React.CSSProperties = { ...sel, width: "100%" }

  // Stats por categoria e raridade
  const byRarity: Record<string, number> = {}
  const byType:   Record<string, number> = {}
  for (const i of items) {
    const r = i.catalog_items?.rarity ?? "Unknown"
    const t = i.catalog_items?.item_type ?? "Unknown"
    byRarity[r] = (byRarity[r] ?? 0) + 1
    byType[t]   = (byType[t]   ?? 0) + 1
  }

  const modalInp: React.CSSProperties = { background: "rgba(0,0,0,0.4)", border: "1px solid var(--stroke)", color: "var(--paper)", padding: "10px 12px", fontSize: 14, borderRadius: 6, font: "inherit", width: "100%", boxSizing: "border-box" as const }

  return (
    <div>
    {/* Modal de edição */}
    {editingItem && (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,7,11,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        onClick={() => setEditingItem(null)}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, width: "100%", maxWidth: 440, padding: 28 }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            {editingItem.catalog_items?.icon_url && <img src={editingItem.catalog_items.icon_url} alt="" style={{ width: 36, height: 36, objectFit: "contain" }} />}
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Editar Preços</p>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>{editingItem.catalog_items?.name ?? editingItem.catalog_item_id}</h2>
            </div>
          </div>

          {/* Referência VEI */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--stroke)", borderRadius: 8, padding: 12, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>VEI</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 950, color: (editingItem.vei ?? 0) >= 70 ? "var(--yellow)" : (editingItem.vei ?? 0) >= 40 ? "var(--cyan)" : "var(--paper-dim)" }}>
                {(editingItem.vei ?? 0).toFixed(1)}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Sugerido pts</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: "var(--paper-dim)" }}>{(editingItem.suggested_points ?? 0).toLocaleString("pt-BR")} pts</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Sugerido R$</p>
              <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: "var(--paper-dim)" }}>R$ {(editingItem.suggested_cash ?? 0).toFixed(2).replace(".", ",")}</p>
            </div>
          </div>

          {/* Campos */}
          <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Preço em Pontos</span>
              <div style={{ position: "relative" }}>
                <input type="number" min={1} value={editForm.price_points}
                  onChange={e => setEditForm(p => ({ ...p, price_points: Number(e.target.value) }))}
                  style={{ ...modalInp, paddingRight: 44 }} />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--yellow)", fontWeight: 950, pointerEvents: "none" }}>pts</span>
              </div>
              {editingItem.suggested_points && editForm.price_points !== editingItem.suggested_points && (
                <button type="button" onClick={() => setEditForm(p => ({ ...p, price_points: editingItem.suggested_points! }))}
                  style={{ background: "none", border: "none", color: "var(--cyan)", fontSize: 11, cursor: "pointer", textAlign: "left", padding: 0, font: "inherit" }}>
                  ↩ Usar sugerido ({editingItem.suggested_points?.toLocaleString("pt-BR")} pts)
                </button>
              )}
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Preço em R$</span>
              <div style={{ position: "relative" }}>
                <input type="number" min={0.01} step={0.01} value={editForm.price_cash}
                  onChange={e => setEditForm(p => ({ ...p, price_cash: Number(e.target.value) }))}
                  style={{ ...modalInp, paddingRight: 44 }} />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--green)", fontWeight: 950, pointerEvents: "none" }}>R$</span>
              </div>
              {editingItem.suggested_cash && editForm.price_cash !== editingItem.suggested_cash && (
                <button type="button" onClick={() => setEditForm(p => ({ ...p, price_cash: editingItem.suggested_cash! }))}
                  style={{ background: "none", border: "none", color: "var(--cyan)", fontSize: 11, cursor: "pointer", textAlign: "left", padding: 0, font: "inherit" }}>
                  ↩ Usar sugerido (R$ {editingItem.suggested_cash?.toFixed(2).replace(".", ",")})
                </button>
              )}
            </label>
          </div>

          {/* Ações */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setEditingItem(null)}
              style={{ border: "1px solid var(--stroke)", background: "none", color: "var(--muted)", padding: "10px 20px", fontSize: 13, cursor: "pointer", borderRadius: 6, font: "inherit" }}>
              Cancelar
            </button>
            <button type="button" onClick={saveEdit} disabled={savingEdit}
              style={{ border: "none", background: "var(--cyan)", color: "#000", padding: "10px 24px", fontSize: 13, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 6, font: "inherit", opacity: savingEdit ? 0.7 : 1 }}>
              {savingEdit ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    )}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>ANÁLISE DE PREÇOS</h1>
      </div>

      {/* Multiplicadores + ações */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head"><strong>Multiplicadores VEI</strong><small>Preço = VEI × multiplicador</small></div>
        <div style={{ display: "flex", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Multiplicador Pontos</span>
            <input type="number" min={1} step={1} value={settings.points_multiplier}
              onChange={e => setSettings(p => ({ ...p, points_multiplier: Number(e.target.value) }))}
              style={{ ...inp, width: 140 }} />
            <span style={{ fontSize: 10, color: "var(--gray-500)" }}>VEI 80 × {settings.points_multiplier} = {(80 * settings.points_multiplier).toLocaleString("pt-BR")} pts</span>
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>Multiplicador R$</span>
            <input type="number" min={0.01} step={0.01} value={settings.cash_multiplier}
              onChange={e => setSettings(p => ({ ...p, cash_multiplier: Number(e.target.value) }))}
              style={{ ...inp, width: 140 }} />
            <span style={{ fontSize: 10, color: "var(--gray-500)" }}>VEI 80 × {settings.cash_multiplier} = R$ {(80 * settings.cash_multiplier).toFixed(2)}</span>
          </label>
          <button type="button" onClick={saveSettings} disabled={savingSettings}
            style={{ alignSelf: "end", border: "1px solid var(--cyan)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            {savingSettings ? "Salvando..." : "Salvar Multiplicadores"}
          </button>
          <button type="button" onClick={bulkAdd} disabled={bulkAdding}
            style={{ alignSelf: "end", border: "1px solid rgba(255,212,0,0.4)", background: "rgba(255,212,0,0.06)", color: "var(--yellow)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            <Package size={12} style={{ marginRight: 4 }} />{bulkAdding ? "Adicionando..." : "Add Todos ao Estoque"}
          </button>
          <button type="button" onClick={() => applyVei()} disabled={applying}
            style={{ alignSelf: "end", border: "1px solid rgba(61,242,139,0.4)", background: "rgba(61,242,139,0.06)", color: "var(--green)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            <TrendingUp size={12} style={{ marginRight: 4 }} />{applying ? "Aplicando..." : "Aplicar VEI a Todos"}
          </button>
          {selectedIds.size > 0 && (
            <button type="button" onClick={() => applyVei([...selectedIds])} disabled={applying}
              style={{ alignSelf: "end", border: "1px solid rgba(91,168,255,0.4)", background: "rgba(91,168,255,0.06)", color: "var(--blue)", padding: "8px 16px", fontSize: 11, fontWeight: 950, textTransform: "uppercase", cursor: "pointer", borderRadius: 4, font: "inherit" }}>
              Aplicar VEI aos {selectedIds.size} selecionados
            </button>
          )}
        </div>
      </div>

      {/* Distribuição rápida */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="utility-panel">
          <div className="utility-panel-head"><strong>Por Raridade</strong></div>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(byRarity).sort((a, b) => b[1] - a[1]).map(([r, n]) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: RARITY_COLORS[r] ?? "var(--gray-500)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, flex: 1 }}>{r}</span>
                <strong style={{ fontSize: 12, color: RARITY_COLORS[r] ?? "var(--paper)" }}>{n}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="utility-panel">
          <div className="utility-panel-head"><strong>Por Categoria</strong></div>
          <div style={{ display: "grid", gap: 6 }}>
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, flex: 1, color: "var(--paper-dim)" }}>{t}</span>
                <strong style={{ fontSize: 12 }}>{n}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela de preços */}
      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Itens no Estoque — {filtered.length} de {items.length}</strong>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar item..." style={{ ...inp, width: 200 }} />
          <select value={filterRarity} onChange={e => setFilterRarity(e.target.value)} style={sel}>
            <option value="">Todas as raridades</option>
            {rarities.map(r => <option key={r} value={r!}>{r}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={sel}>
            <option value="">Todas as categorias</option>
            {types.map(t => <option key={t} value={t!}>{t}</option>)}
          </select>
          <select value={filterVei} onChange={e => setFilterVei(e.target.value)} style={sel}>
            <option value="">Todos os VEIs</option>
            <option value="low">VEI baixo (&lt;40)</option>
            <option value="mid">VEI médio (40-70)</option>
            <option value="high">VEI alto (&gt;70)</option>
          </select>
          <button type="button" onClick={() => { setSearch(""); setFilterRarity(""); setFilterType(""); setFilterVei("") }}
            style={{ border: "1px solid var(--stroke)", background: "none", color: "var(--muted)", padding: "6px 12px", fontSize: 11, cursor: "pointer", borderRadius: 4, font: "inherit" }}>
            Limpar
          </button>
        </div>

        {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                  <th style={{ padding: "8px 4px", width: 28 }}>
                    <input type="checkbox"
                      checked={pagedItems.length > 0 && pagedItems.every(i => selectedIds.has(i.catalog_item_id))}
                      onChange={e => {
                        const s = new Set(selectedIds)
                        pagedItems.forEach(i => e.target.checked ? s.add(i.catalog_item_id) : s.delete(i.catalog_item_id))
                        setSelectedIds(s)
                      }} />
                  </th>
                  {["Item", "Raridade", "Tipo", "VEI", "Pts Atual", "Pts Sugerido", "Δ Pts", "R$ Atual", "R$ Sugerido", "Qtd"].map(h => (
                    <th key={h} style={{ padding: "8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.map(item => {
                  const diffPts  = priceDiff(item.price_points, item.suggested_points ?? 0)
                  const diffCash = priceDiff(item.price_cash,   item.suggested_cash   ?? 0)
                  const rarColor = RARITY_COLORS[item.catalog_items?.rarity ?? "Unknown"] ?? "var(--gray-500)"
                  return (
                    <tr key={item.catalog_item_id} onClick={() => openEdit(item)}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}>
                      <td style={{ padding: "6px 4px" }}>
                        <input type="checkbox"
                          checked={selectedIds.has(item.catalog_item_id)}
                          onChange={e => { const s = new Set(selectedIds); e.target.checked ? s.add(item.catalog_item_id) : s.delete(item.catalog_item_id); setSelectedIds(s) }} />
                      </td>
                      <td style={{ padding: "6px 8px", fontWeight: 800 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {item.catalog_items?.icon_url && <img src={item.catalog_items.icon_url} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                          <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.catalog_items?.name ?? item.catalog_item_id}</span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 8px" }}><span style={{ fontSize: 10, fontWeight: 950, color: rarColor }}>{item.catalog_items?.rarity ?? "—"}</span></td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)", fontSize: 11 }}>{item.catalog_items?.item_type ?? "—"}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <strong style={{ color: (item.vei ?? 0) >= 70 ? "var(--yellow)" : (item.vei ?? 0) >= 40 ? "var(--cyan)" : "var(--paper-dim)" }}>{(item.vei ?? 0).toFixed(1)}</strong>
                      </td>
                      {/* Pts Atual (editável) */}
                      <td style={{ padding: "6px 4px" }} onClick={e => e.stopPropagation()}>
                        <input type="number" min={1} defaultValue={item.price_points}
                          onBlur={e => { const v = Number(e.target.value); if (v !== item.price_points) updatePrice(item.catalog_item_id, "price_points", v) }}
                          style={{ width: 80, background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--yellow)", padding: "3px 6px", fontSize: 11, fontWeight: 950, borderRadius: 4, font: "inherit", textAlign: "right" }} />
                      </td>
                      <td style={{ padding: "6px 8px", color: "var(--paper-dim)" }}>{(item.suggested_points ?? 0).toLocaleString("pt-BR")}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ fontSize: 10, fontWeight: 950, color: Math.abs(diffPts) > 20 ? "var(--red)" : "var(--gray-500)" }}>
                          {diffPts > 0 ? "+" : ""}{diffPts}%
                        </span>
                      </td>
                      {/* R$ Atual (editável) */}
                      <td style={{ padding: "6px 4px" }} onClick={e => e.stopPropagation()}>
                        <input type="number" min={0.01} step={0.01} defaultValue={item.price_cash}
                          onBlur={e => { const v = Number(e.target.value); if (v !== item.price_cash) updatePrice(item.catalog_item_id, "price_cash", v) }}
                          style={{ width: 80, background: "rgba(0,0,0,0.3)", border: "1px solid var(--stroke)", color: "var(--green)", padding: "3px 6px", fontSize: 11, fontWeight: 950, borderRadius: 4, font: "inherit", textAlign: "right" }} />
                      </td>
                      <td style={{ padding: "6px 8px", color: "var(--paper-dim)" }}>R$ {(item.suggested_cash ?? 0).toFixed(2).replace(".", ",")}</td>
                      <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{item.quantity === -1 ? "∞" : item.quantity}</td>
                    </tr>
                  )
                })}
                {pagedItems.length === 0 && <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>Nenhum item encontrado.</td></tr>}
              </tbody>
            </table>

            {/* Paginação */}
            {filtered.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 11, color: "var(--gray-500)" }}>
                  {filtered.length === 0 ? "0 itens" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} de ${filtered.length} itens`}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={{ ...sel, fontSize: 11 }}>
                    <option value={25}>25 / página</option>
                    <option value={50}>50 / página</option>
                    <option value={100}>100 / página</option>
                  </select>
                  <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ border: "1px solid var(--stroke)", background: "none", color: page === 1 ? "var(--gray-500)" : "var(--paper)", padding: "5px 12px", fontSize: 11, cursor: page === 1 ? "default" : "pointer", borderRadius: 4, font: "inherit", opacity: page === 1 ? 0.4 : 1 }}>
                    ← Anterior
                  </button>
                  <span style={{ fontSize: 11, color: "var(--paper-dim)", whiteSpace: "nowrap", padding: "0 4px" }}>
                    {page} / {totalPages}
                  </span>
                  <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ border: "1px solid var(--stroke)", background: "none", color: page === totalPages ? "var(--gray-500)" : "var(--paper)", padding: "5px 12px", fontSize: 11, cursor: page === totalPages ? "default" : "pointer", borderRadius: 4, font: "inherit", opacity: page === totalPages ? 0.4 : 1 }}>
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { getItemTypeLabel, getRarityLabel } from "@/lib/catalog"

type StockItem = {
  catalog_item_id: string
  value: number
  quantity: number
  featured: boolean
  catalog_items: { name: string; item_type: string | null; rarity: string | null; icon_url: string | null }
}

type AvailableItem = {
  id: string
  name: string
  item_type: string | null
  rarity: string | null
  icon_url: string | null
}

const PAGE_SIZE = 20

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "12px",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

const numberInputStyle: React.CSSProperties = { ...inputStyle, width: "100px" }

export default function AdminEstoquePage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)

  const [availableQuery, setAvailableQuery] = useState("")
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [searchingAvailable, setSearchingAvailable] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)

    const res = await fetch(`/api/admin/stock?${params.toString()}`)
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setItems(body.items ?? [])
      setTotal(body.total ?? 0)
    }
    setLoading(false)
  }, [page, q])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSearchingAvailable(true)
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams()
      if (availableQuery) params.set("q", availableQuery)
      const res = await fetch(`/api/admin/stock/available?${params.toString()}`)
      const body = await res.json().catch(() => ({}))
      if (res.ok) setAvailableItems(body.items ?? [])
      setSearchingAvailable(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [availableQuery])

  async function patchItem(id: string, patch: Record<string, unknown>) {
    setItems(prev => prev.map(it => it.catalog_item_id === id ? { ...it, ...patch } as StockItem : it))
    await fetch(`/api/admin/stock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  }

  async function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.catalog_item_id !== id))
    setTotal(t => Math.max(0, t - 1))
    await fetch(`/api/admin/stock/${id}`, { method: "DELETE" })
  }

  async function addItem(item: AvailableItem) {
    setAvailableItems(prev => prev.filter(i => i.id !== item.id))
    await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog_item_id: item.id, value: 0, quantity: 0, featured: false }),
    })
    load()
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <div className="utility-panel" style={{ marginBottom: "16px" }}>
        <div className="utility-panel-head">
          <strong>Adicionar item ao estoque</strong>
        </div>
        <input
          type="search"
          placeholder="Buscar no catálogo por nome..."
          value={availableQuery}
          onChange={e => setAvailableQuery(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
        />
        {searchingAvailable ? (
          <p style={{ color: "var(--muted)", fontSize: "12px" }}>Buscando...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {availableItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {item.icon_url && <img src={item.icon_url} alt={item.name} style={{ width: "24px", height: "24px", objectFit: "contain" }} />}
                <span style={{ flex: 1, fontSize: "12px", fontWeight: 800 }}>{item.name}</span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{getItemTypeLabel(item.item_type)}</span>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{getRarityLabel(item.rarity)}</span>
                <button type="button" onClick={() => addItem(item)} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)" }}>
                  Adicionar
                </button>
              </div>
            ))}
            {availableItems.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: "12px" }}>Nenhum item disponível para adicionar.</p>
            )}
          </div>
        )}
      </div>

      <div className="utility-panel" style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Buscar por nome..."
          value={q}
          onChange={e => { setPage(1); setQ(e.target.value) }}
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
      </div>

      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Itens em estoque</strong>
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
                  <th style={{ padding: "8px" }}>Nome</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Raridade</th>
                  <th style={{ padding: "8px" }}>Valor</th>
                  <th style={{ padding: "8px" }}>Quantidade</th>
                  <th style={{ padding: "8px" }}>Destaque</th>
                  <th style={{ padding: "8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.catalog_item_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px" }}>
                      {item.catalog_items.icon_url ? (
                        <img src={item.catalog_items.icon_url} alt={item.catalog_items.name} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                      ) : null}
                    </td>
                    <td style={{ padding: "8px", fontWeight: 800 }}>{item.catalog_items.name}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{getItemTypeLabel(item.catalog_items.item_type)}</td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{getRarityLabel(item.catalog_items.rarity)}</td>
                    <td style={{ padding: "8px" }}>
                      <input
                        type="number"
                        value={item.value}
                        style={numberInputStyle}
                        onChange={e => {
                          const value = e.target.value === "" ? 0 : Number(e.target.value)
                          if (!Number.isNaN(value)) setItems(prev => prev.map(it => it.catalog_item_id === item.catalog_item_id ? { ...it, value } : it))
                        }}
                        onBlur={() => patchItem(item.catalog_item_id, { value: item.value })}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>
                      <input
                        type="number"
                        value={item.quantity}
                        style={numberInputStyle}
                        onChange={e => {
                          const quantity = e.target.value === "" ? 0 : Number(e.target.value)
                          if (!Number.isNaN(quantity)) setItems(prev => prev.map(it => it.catalog_item_id === item.catalog_item_id ? { ...it, quantity } : it))
                        }}
                        onBlur={() => patchItem(item.catalog_item_id, { quantity: item.quantity })}
                      />
                    </td>
                    <td style={{ padding: "8px" }}>
                      <input type="checkbox" checked={item.featured} onChange={e => patchItem(item.catalog_item_id, { featured: e.target.checked })} />
                    </td>
                    <td style={{ padding: "8px" }}>
                      <button type="button" onClick={() => removeItem(item.catalog_item_id)} style={{ ...btnStyle, borderColor: "#ff8c9a", color: "#ff8c9a" }}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum item em estoque. Use a busca acima para adicionar itens do catálogo.</td></tr>
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

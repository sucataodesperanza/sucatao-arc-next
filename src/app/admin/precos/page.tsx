"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getItemTypeLabel } from "@/lib/catalog"
import { parsePriceInput, priceFields, priceInputText, shouldKeepPriceInput, type PriceField } from "@/lib/price-editor"
import "@/styles/admin-prices.css"

type Item = { catalog_item_id: string; price_points: number | null; price_cash: number | null; quantity: number; catalog_items: { name: string; rarity: string | null; item_type: string | null; icon_url: string | null } | null }
type Draft = Record<string, Partial<Record<PriceField, string>>>
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const priceText = (item: Item, field: PriceField) => priceInputText(item[field], field)
const tierOf = (item: Item) => /amplified/i.test(item.catalog_items?.name ?? "") ? "V" : item.catalog_items?.name.match(/\b(IV|III|II|I|V)\b/)?.[1] ?? ""

export default function AdminPrecosPage() {
  const [items, setItems] = useState<Item[]>([])
  const [draft, setDraft] = useState<Draft>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [message, setMessage] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [tier, setTier] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [bulkPoints, setBulkPoints] = useState("")
  const [bulkCash, setBulkCash] = useState("")
  const [usePoints, setUsePoints] = useState(false)
  const [useCash, setUseCash] = useState(true)
  const [suggestionField, setSuggestionField] = useState("both")
  const dirtyIds = Object.keys(draft)
  const busy = loading || saving || suggesting
  const invalid = Object.values(draft).some(row => priceFields.some(field => row[field] !== undefined && parsePriceInput(row[field]!, field) === null))

  const load = useCallback(async () => {
    setLoading(true); setMessage("")
    try {
      const all: Item[] = []
      for (let pg = 1; ; pg++) {
        const response = await fetch(`/api/admin/prices?page=${pg}`, { cache: "no-store" })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar os preços.")
        all.push(...body.items)
        if (all.length >= body.total) break
        if (!body.items.length) throw new Error("A lista não carregou por completo. Tente atualizar.")
      }
      all.sort((a, b) => (a.catalog_items?.name ?? a.catalog_item_id).localeCompare(b.catalog_items?.name ?? b.catalog_item_id, "pt-BR"))
      setItems(all); setSelected(new Set()); setErrors({})
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar os preços.") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const refresh = () => { if (!busy && !dirtyIds.length) void load() }
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [load, busy, dirtyIds.length])
  useEffect(() => {
    if (!dirtyIds.length) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    const leaving = (event: MouseEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) return
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]")
      if (!link || link.target === "_blank" || (link.pathname === window.location.pathname && link.search === window.location.search)) return
      if (saving || !window.confirm("Há alterações não salvas. Deseja sair e descartar essas edições?")) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", leaving, true)
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leaving, true) }
  }, [dirtyIds.length, saving])
  useEffect(() => setPage(1), [search, category, tier, status])

  const filtered = useMemo(() => items.filter(item => {
    const name = item.catalog_items?.name ?? item.catalog_item_id
    if (search && !normalize(name).includes(normalize(search))) return false
    if (category && item.catalog_items?.item_type !== category) return false
    if (tier && tierOf(item) !== tier) return false
    if (status === "pending" && !draft[item.catalog_item_id]) return false
    if (status === "missing" && Number(item.price_points) > 0 && Number(item.price_cash) > 0) return false
    if (status === "stock" && item.quantity <= 0) return false
    return true
  }), [items, search, category, tier, status, draft])
  const totalPages = Math.max(1, Math.ceil(filtered.length / 50))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * 50, currentPage * 50)

  function edit(item: Item, field: PriceField, value: string) {
    setDraft(previous => {
      const next = { ...previous }, row = { ...next[item.catalog_item_id] }
      if (shouldKeepPriceInput(value, item[field], field)) row[field] = value
      else delete row[field]
      if (Object.keys(row).length) next[item.catalog_item_id] = row
      else delete next[item.catalog_item_id]
      return next
    })
    setErrors(previous => { const next = { ...previous }; delete next[item.catalog_item_id]; return next })
  }
  function bulk() {
    if ((!useCash && !usePoints) || !selected.size) return
    if ((usePoints && parsePriceInput(bulkPoints, "price_points") === null) || (useCash && parsePriceInput(bulkCash, "price_cash") === null)) { setMessage("Informe pontos inteiros positivos e/ou reais no formato 1,50."); return }
    for (const item of items.filter(item => selected.has(item.catalog_item_id))) {
      if (usePoints) edit(item, "price_points", bulkPoints)
      if (useCash) edit(item, "price_cash", bulkCash)
    }
    setMessage("Valores preparados nos selecionados. Revise as células destacadas e clique em Salvar alterações.")
  }
  async function suggestions() {
    setSuggesting(true); setMessage("")
    const ids = [...selected]
    try {
      const prepared: Draft = {}
      for (let index = 0; index < ids.length; index += 100) {
        const response = await fetch("/api/admin/prices/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.slice(index, index + 100) }) })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar sugestões.")
        for (const row of body.items) {
          const item = items.find(item => item.catalog_item_id === row.id)
          if (!item) continue
          for (const field of priceFields) if ((suggestionField === "both" || suggestionField === field) && !draft[row.id]?.[field] && Number(item[field]) !== row[field]) prepared[row.id] = { ...prepared[row.id], [field]: field === "price_cash" ? String(row[field]).replace(".", ",") : String(row[field]) }
        }
      }
      setDraft(previous => { const next = { ...previous }; for (const [id, fields] of Object.entries(prepared)) next[id] = { ...fields, ...next[id] }; return next })
      setMessage("Sugestões preparadas para revisão. Edições já digitadas foram preservadas. Nada foi salvo ainda.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar sugestões.") }
    finally { setSuggesting(false) }
  }
  async function save() {
    if (busy || invalid || !dirtyIds.length) return
    setSaving(true); setMessage(""); setErrors({})
    let saved = 0
    try {
      for (let index = 0; index < dirtyIds.length; index += 100) {
        const batch = dirtyIds.slice(index, index + 100).map(id => {
          const item = items.find(item => item.catalog_item_id === id)!
          const changes: Partial<Record<PriceField, number>> = {}, expected: Partial<Record<PriceField, number | null>> = {}
          for (const field of priceFields) if (draft[id][field] !== undefined) { changes[field] = parsePriceInput(draft[id][field]!, field)!; expected[field] = item[field] == null ? null : Number(item[field]) }
          return { id, changes, expected }
        })
        const response = await fetch("/api/admin/prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: batch }) })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar este lote.")
        const succeeded = new Set<string>(body.results.filter((row: { ok: boolean }) => row.ok).map((row: { id: string }) => row.id))
        saved += succeeded.size
        setItems(previous => previous.map(item => succeeded.has(item.catalog_item_id) ? { ...item, ...batch.find(row => row.id === item.catalog_item_id)!.changes } : item))
        setDraft(previous => { const next = { ...previous }; for (const id of succeeded) delete next[id]; return next })
        setErrors(previous => ({ ...previous, ...Object.fromEntries(body.results.filter((row: { ok: boolean }) => !row.ok).map((row: { id: string; error: string }) => [row.id, row.error])) }))
      }
      setMessage(`${saved} item(ns) salvo(s).${saved < dirtyIds.length ? " Os itens com erro continuam destacados para revisão." : " Todos os preços foram atualizados."}`)
    } catch (error) { setMessage(`${saved} item(ns) confirmado(s). ${error instanceof Error ? error.message : "Falha de conexão."} As alterações restantes foram mantidas.`) }
    finally { setSaving(false) }
  }

  return <div className="admin-prices"><header><h1>Preços</h1><p>Somente itens ativos no Catálogo. Edite na tabela, use Tab para avançar e salve tudo de uma vez.</p></header>
    <div className="price-toolbar"><input aria-label="Buscar item" placeholder="Buscar item…" value={search} onChange={event => setSearch(event.target.value)} />
      <select aria-label="Categoria" value={category} onChange={event => setCategory(event.target.value)}><option value="">Todas as categorias</option>{[...new Set(items.map(item => item.catalog_items?.item_type).filter(Boolean))].sort().map(type => <option key={type} value={type!}>{getItemTypeLabel(type!)}</option>)}</select>
      <select aria-label="Tier" value={tier} onChange={event => setTier(event.target.value)}><option value="">Todos os tiers</option>{["I", "II", "III", "IV", "V"].map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Situação" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todos os itens</option><option value="missing">Sem preço completo</option><option value="pending">Alterados nesta edição</option><option value="stock">Com estoque</option></select>
      <button disabled={busy || !!dirtyIds.length} onClick={load}>Atualizar lista</button>
    </div>
    <p role="status" className="price-message">{message}</p>
    {selected.size > 0 && <section className="price-bulk" aria-label="Definir preço em lote"><strong>{selected.size} item(ns) selecionado(s)</strong><label><input type="checkbox" checked={usePoints} disabled={busy} onChange={event => setUsePoints(event.target.checked)} />Pontos<input aria-label="Pontos em lote" placeholder="15000" disabled={busy || !usePoints} inputMode="numeric" value={bulkPoints} onChange={event => setBulkPoints(event.target.value)} /></label><label><input type="checkbox" checked={useCash} disabled={busy} onChange={event => setUseCash(event.target.checked)} />Reais<input aria-label="Reais em lote" placeholder="1,50" disabled={busy || !useCash} inputMode="decimal" value={bulkCash} onChange={event => setBulkCash(event.target.value)} /></label><button disabled={busy || (!useCash && !usePoints)} onClick={bulk}>Definir preço nos selecionados</button><button disabled={busy} onClick={() => setSelected(new Set())}>Limpar seleção</button></section>}
    <div className="price-selection"><span>{filtered.length} de {items.length} itens · {dirtyIds.length} alterado(s)</span><button disabled={busy || !filtered.length} onClick={() => setSelected(new Set(filtered.map(item => item.catalog_item_id)))}>Selecionar todos os {filtered.length} resultados</button></div>
    <div className="price-table"><table><thead><tr><th><input aria-label="Selecionar esta página" type="checkbox" disabled={busy} checked={!!visible.length && visible.every(item => selected.has(item.catalog_item_id))} onChange={event => setSelected(previous => { const next = new Set(previous); for (const item of visible) if (event.target.checked) next.add(item.catalog_item_id); else next.delete(item.catalog_item_id); return next })} /></th><th>Item</th><th>Categoria / Tier</th><th>Pontos</th><th>Reais</th><th>Edição</th></tr></thead><tbody>{visible.map(item => {
      const id = item.catalog_item_id
      return <tr key={id} className={draft[id] ? "price-row-edited" : ""}><td><input aria-label={`Selecionar ${item.catalog_items?.name}`} type="checkbox" disabled={busy} checked={selected.has(id)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(id); else next.delete(id); return next })} /></td><td><div className="price-item">{item.catalog_items?.icon_url && <img src={item.catalog_items.icon_url} alt="" loading="lazy" />}<strong>{item.catalog_items?.name ?? id}</strong></div>{errors[id] && <p role="alert" className="price-error">{errors[id]}</p>}</td><td>{getItemTypeLabel(item.catalog_items?.item_type ?? undefined)}{tierOf(item) && ` · ${tierOf(item)}`}</td>{priceFields.map(field => { const changed = draft[id]?.[field] !== undefined; const value = draft[id]?.[field] ?? priceText(item, field); const bad = changed && parsePriceInput(value, field) === null; return <td key={field}><input aria-label={`${field === "price_points" ? "Pontos" : "Reais"}: ${item.catalog_items?.name}`} aria-invalid={bad} disabled={busy} className={changed ? "price-input-edited" : ""} inputMode={field === "price_points" ? "numeric" : "decimal"} value={value} onChange={event => edit(item, field, event.target.value)} />{bad && <small className="price-error">{field === "price_points" ? "Use um inteiro positivo" : "Use um valor positivo, ex.: 1,50"}</small>}</td>})}<td>{draft[id] ? <button disabled={busy} onClick={() => { setDraft(previous => { const next = { ...previous }; delete next[id]; return next }); setErrors(previous => { const next = { ...previous }; delete next[id]; return next }) }}>Desfazer</button> : <small>Salvo</small>}</td></tr>
    })}{!visible.length && <tr><td colSpan={6}>{loading ? "Carregando preços…" : "Nenhum item encontrado."}</td></tr>}</tbody></table></div>
    <nav className="price-pagination" aria-label="Páginas de preços"><button disabled={busy || currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>{currentPage} / {totalPages}</span><button disabled={busy || currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav>
    <details className="price-advanced"><summary>Opções avançadas · sugestões VEI</summary><p>Selecione os itens, escolha a moeda e carregue as sugestões. Elas ficam destacadas para revisão e só são gravadas ao salvar. Preços já digitados são preservados.</p><select aria-label="Moedas das sugestões" value={suggestionField} onChange={event => setSuggestionField(event.target.value)}><option value="both">Pontos e reais</option><option value="price_points">Somente pontos</option><option value="price_cash">Somente reais</option></select><button disabled={busy || !selected.size} onClick={suggestions}>{suggesting ? "Calculando…" : `Preparar sugestões para ${selected.size} selecionado(s)`}</button></details>
    <footer className="price-savebar"><span>{invalid ? "Corrija os campos inválidos antes de salvar." : `${dirtyIds.length} item(ns) com alterações não salvas`}</span><button disabled={busy || !dirtyIds.length} onClick={() => { setDraft({}); setErrors({}); setMessage("Edições pendentes descartadas. Os preços salvos foram mantidos.") }}>Descartar alterações</button><button className="price-save" disabled={busy || invalid || !dirtyIds.length} onClick={save}>{saving ? "Salvando…" : "Salvar alterações"}</button></footer>
  </div>
}

"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import arcData from "@/data/arc-data"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/cart-context"
import { getItemTypeLabel } from "@/lib/catalog"

type Item = {
  id: string; name: string; nameEn?: string; type?: string; rarity?: string
  value?: number; quantity?: number; weightKg?: number; stackSize?: number
  isWeapon?: boolean; isBlueprint?: boolean; isCraftable?: boolean; isRecyclable?: boolean
  image?: string; description?: string; featured?: boolean
}
type Bot = {
  id: string; name: string; type?: string; threat?: string; weakness?: string
  description?: string; drops?: string[]; image?: string
}
type ArcDataItem = { id: string; name: string }

const arcMeta = arcData as unknown as { items: ArcDataItem[]; bots: Bot[] }

function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unknown"]
const rarityLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Épico", Legendary: "Lendário", Unknown: "Desconhecido"
}
const rarityMetaLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Epico", Legendary: "Lendario", Unknown: "Desconhecido"
}
const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

function getRarity(item: Item) {
  return rarityOrder.includes(item.rarity ?? "") ? (item.rarity as string) : "Unknown"
}
function getType(item: Item) { return item.type ?? "Item" }
function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

export default function ItensPage() {
  const router = useRouter()
  const cart = useCart()
  const [query, setQuery] = useState("")
  const [rarity, setRarity] = useState("all")
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("value-desc")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [botFilter, setBotFilter] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavorites, setShowFavorites] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from("profiles").select("points").eq("id", user.id).single().then(({ data }) => {
        if (data) setPoints(data.points ?? 0)
      })
    })
  }, [])

  useEffect(() => {
    fetch("/api/catalog")
      .then(res => res.json())
      .then(body => setCatalogItems(body.items ?? []))
      .finally(() => setLoadingCatalog(false))
  }, [])

  function toggleFavorite(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function openItem(item: Item, e: React.MouseEvent) {
    e.stopPropagation()
    setSelectedItem(item)
  }

  function handleAddToCart(item: Item, mode: "points" | "cash", e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!userId) { router.push("/login"); return }
    cart.addItem({
      itemId: item.id,
      name: item.name,
      type: getType(item),
      rarity: getRarity(item),
      value: item.value ?? 0,
      weightKg: item.weightKg,
      image: item.image,
      mode,
    })
    cart.openDrawer()
  }

  const rarities = useMemo(() => rarityOrder.filter(r => catalogItems.some(i => getRarity(i) === r)), [catalogItems])
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    catalogItems.forEach(i => counts.set(getType(i), (counts.get(getType(i)) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
  }, [catalogItems])

  const botDropNames = useMemo(() => {
    if (!botFilter) return null
    const bot = arcMeta.bots.find(b => b.id === botFilter)
    if (!bot?.drops?.length) return new Set<string>()
    const names = bot.drops
      .map(dropId => arcMeta.items.find(i => i.id === dropId)?.name)
      .filter((n): n is string => !!n)
      .map(normalizeText)
    return new Set(names)
  }, [botFilter])

  const filteredItems = useMemo(() => {
    const q = normalizeText(query)
    let items = catalogItems.filter(item => {
      if (rarity !== "all" && getRarity(item) !== rarity) return false
      if (type !== "all" && getType(item) !== type) return false
      if (showFavorites && !favorites.has(item.id)) return false
      if (botDropNames && !botDropNames.has(normalizeText(item.name))) return false
      if (!q) return true
      return normalizeText(`${item.name} ${item.nameEn ?? ""} ${item.type ?? ""} ${item.description ?? ""}`).includes(q)
    })
    if (sort === "value-desc") items.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    else if (sort === "value-asc") items.sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    else if (sort === "value-per-kg-desc") items.sort((a, b) => ((b.value ?? 0) / (b.weightKg ?? 1)) - ((a.value ?? 0) / (a.weightKg ?? 1)))
    else if (sort === "name-asc") items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    else if (sort === "type-asc") items.sort((a, b) => getItemTypeLabel(getType(a)).localeCompare(getItemTypeLabel(getType(b)), "pt-BR"))
    return items
  }, [catalogItems, query, rarity, type, sort, botDropNames, showFavorites, favorites])

  const visibleBots = arcMeta.bots.slice(0, 6)

  return (
    <>
      <section className="control-panel" aria-label="Busca e filtros">
        <label className="search-box">
          <span>Buscar</span>
          <input type="search" autoComplete="off" placeholder="Buscar itens por nome..." value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className="filter-row">
          <details className="filter-dropdown">
            <summary><span>Raridade</span><strong>{rarity === "all" ? "Todos" : rarityLabels[rarity] ?? rarity}</strong></summary>
            <div className="dropdown-menu">
              <button type="button" className={rarity === "all" ? "active" : ""} onClick={() => setRarity("all")}>Todos</button>
              {rarities.map(r => (
                <button key={r} type="button" className={rarity === r ? "active" : ""} onClick={() => setRarity(r)}>{rarityLabels[r]}</button>
              ))}
            </div>
          </details>
          <details className="filter-dropdown">
            <summary><span>Tipo</span><strong>{type === "all" ? "Todos" : getItemTypeLabel(type)}</strong></summary>
            <div className="dropdown-menu">
              <button type="button" className={type === "all" ? "active" : ""} onClick={() => setType("all")}>Todos</button>
              {types.map(t => (
                <button key={t} type="button" className={type === t ? "active" : ""} onClick={() => setType(t)}>{getItemTypeLabel(t)}</button>
              ))}
            </div>
          </details>
          <label className="sort-box">
            <span>Ordenar</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="value-desc">Valor maior</option>
              <option value="value-asc">Valor menor</option>
              <option value="value-per-kg-desc">Valor por kg</option>
              <option value="name-asc">Nome A-Z</option>
              <option value="type-asc">Tipo</option>
            </select>
          </label>
          <button
            type="button"
            className={`favorite-filter-toggle${showFavorites ? " active" : ""}`}
            onClick={() => setShowFavorites(v => !v)}
          >
            Só favoritos
          </button>
          {botFilter && (
            <button type="button" className="favorite-filter-toggle active" onClick={() => setBotFilter(null)}>
              Limpar filtro ARC
            </button>
          )}
        </div>
      </section>

      <section className="database-layout">
        <section className="item-section" aria-labelledby="itemsTitle">
          <div className="section-head">
            <div>
              <p>Exibindo <strong>{filteredItems.length}</strong> de <strong>{catalogItems.length}</strong> itens</p>
              <h2 id="itemsTitle">Itens catalogados</h2>
            </div>
            <span>Sort: {sort.replace("-", " ")}</span>
          </div>
          <div className="item-grid">
            {loadingCatalog ? (
              <article className="item-card">
                <div className="item-body"><h3>Carregando catálogo...</h3><p className="item-type">Buscando itens</p></div>
              </article>
            ) : filteredItems.length === 0 ? (
              <article className="item-card">
                <div className="item-body"><h3>Nenhum item encontrado</h3><p className="item-type">Ajuste busca ou filtros</p></div>
              </article>
            ) : filteredItems.map(item => {
              const r = getRarity(item)
              const isFeatured = item.isWeapon || item.featured
              return (
                <article
                  key={item.id}
                  className={`item-card${isFeatured ? " featured" : ""}`}
                  style={{ "--rarity-color": rarityColors[r] } as React.CSSProperties}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe de ${item.name}`}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={e => { if (e.key === "Enter") setSelectedItem(item) }}
                >
                  <div className="item-meta">
                    <strong>{rarityMetaLabels[r]}</strong>
                    <span>{item.isBlueprint ? "Projeto" : getItemTypeLabel(getType(item))}</span>
                  </div>
                  <div className="item-media">
                    {item.image
                      ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
                      : <div className="placeholder">{item.name[0].toUpperCase()}</div>}
                    {(isFeatured || item.quantity === 0) && (
                      <div className="item-market-badges">
                        {isFeatured && <span className="item-market-badge featured">Destaque</span>}
                        {item.quantity === 0 && <span className="item-market-badge soldout">Esgotado</span>}
                      </div>
                    )}
                    <button
                      className={`favorite${favorites.has(item.id) ? " active" : ""}`}
                      type="button"
                      aria-label="Favoritar"
                      onClick={e => toggleFavorite(item.id, e)}
                    >♡</button>
                  </div>
                  <div className="item-body">
                    <div>
                      <h3>{item.name}</h3>
                      <p className="item-type">{getItemTypeLabel(getType(item))}</p>
                    </div>
                    <div>
                      <div className="value-grid">
                        <div className="value-row">
                          <span>Valor real</span>
                          <strong>{formatNumber(item.value)}</strong>
                        </div>
                        <div className="value-row value-row-points">
                          <span>Pontos do site</span>
                          <strong>{formatNumber((item.value ?? 0) * 24)}</strong>
                        </div>
                        {item.stackSize != null && (
                          <div className="value-row">
                            <span>Estoque</span>
                            <strong>{item.stackSize}</strong>
                          </div>
                        )}
                      </div>
                      <div className="item-action-row">
                        <button className="item-action-button" type="button" disabled={item.quantity === 0} onClick={e => handleAddToCart(item, "points", e)}>Resgatar</button>
                        <button className="item-action-button cash" type="button" disabled={item.quantity === 0} onClick={e => handleAddToCart(item, "cash", e)}>Comprar</button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <aside className="intel-panel" aria-label="Intel lateral">
          <section>
            <h2>ARC intel</h2>
            <p className="panel-hint">Clique em um ARC para buscar um drop relacionado.</p>
            <div className="bot-list">
              {visibleBots.map(bot => (
                <button
                  key={bot.id}
                  type="button"
                  className={`bot-card${botFilter === bot.id ? " active" : ""}`}
                  title={bot.weakness ?? bot.description ?? bot.name}
                  onClick={() => setBotFilter(botFilter === bot.id ? null : bot.id)}
                >
                  {bot.image
                    ? <img src={`/${bot.image}`} alt={bot.name} loading="lazy" />
                    : <div className="placeholder">A</div>}
                  <div>
                    <strong>{bot.name}</strong>
                    <small>{bot.threat ?? bot.type ?? "ARC"}</small>
                    {bot.drops?.[0] ? <em>Drop: {arcMeta.items.find(i => i.id === bot.drops![0])?.name ?? bot.drops![0]}</em> : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="source-card">
            <h2>Fonte</h2>
            <p>Dados importados do pacote comunitário RaidTheory/arcraiders-data Tech Test 2.</p>
            <small>Use com atribuição para RaidTheory/arcraiders-data e arctracker.io.</small>
          </section>
        </aside>
      </section>

      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <article className="item-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Fechar detalhe" onClick={() => setSelectedItem(null)}>×</button>
            <div className="modal-media">
              {selectedItem.image
                ? <img src={resolveImage(selectedItem.image)} alt={selectedItem.name} />
                : <div className="placeholder">{selectedItem.name[0]}</div>}
            </div>
            <div className="modal-content">
              <p className="modal-kicker" style={{ color: rarityColors[getRarity(selectedItem)] }}>
                {rarityMetaLabels[getRarity(selectedItem)]} // {getItemTypeLabel(getType(selectedItem))}
              </p>
              <h2>{selectedItem.name}</h2>
              {selectedItem.description && <p className="modal-description">{selectedItem.description}</p>}
              <div className="modal-stats">
                <span><small>Valor real</small><strong>{formatNumber(selectedItem.value)}</strong></span>
                <span><small>Pontos do site</small><strong>{formatNumber((selectedItem.value ?? 0) * 24)}</strong></span>
                <span><small>Peso</small><strong>{selectedItem.weightKg ? `${selectedItem.weightKg} kg` : "N/D"}</strong></span>
                <span><small>Stack</small><strong>{selectedItem.stackSize ? formatNumber(selectedItem.stackSize) : "Livre"}</strong></span>
              </div>
              <div className="item-purchase-actions">
                <button type="button" disabled={selectedItem.quantity === 0} onClick={() => handleAddToCart(selectedItem, "points")}>
                  Resgatar com pontos
                </button>
                <button type="button" disabled={selectedItem.quantity === 0} onClick={() => handleAddToCart(selectedItem, "cash")}>
                  Comprar com saldo real
                </button>
              </div>
              {selectedItem.quantity === 0 && (
                <p className="modal-purchase-status cart-summary-warn">Item esgotado no momento.</p>
              )}
              {userId ? (
                <p className="modal-purchase-status">Seus pontos do site: <strong>{formatNumber(points)}</strong></p>
              ) : (
                <p className="modal-purchase-status">Entre em uma conta local para salvar compras e resgates.</p>
              )}
              <div className="modal-flags">
                {selectedItem.isWeapon && <span>Arma</span>}
                {selectedItem.isCraftable && <span>Craftável</span>}
                {selectedItem.isRecyclable && <span>Reciclável</span>}
                {selectedItem.isBlueprint && <span>Blueprint</span>}
                {selectedItem.weightKg ? <span>{formatNumber(Math.round((selectedItem.value ?? 0) / selectedItem.weightKg))} por kg</span> : null}
                {(selectedItem.isWeapon || selectedItem.featured) && <span>Destaque do marketplace</span>}
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  )
}


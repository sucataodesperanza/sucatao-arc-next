"use client"

import { useState, useMemo } from "react"
import arcData from "@/data/arc-data"
import Image from "next/image"

type Item = {
  id: string; name: string; nameEn?: string; type?: string; rarity?: string
  value?: number; weightKg?: number; stackSize?: number
  isWeapon?: boolean; isBlueprint?: boolean; isCraftable?: boolean; isRecyclable?: boolean
  image?: string; description?: string
}
type Bot = {
  id: string; name: string; type?: string; threat?: string; weakness?: string
  description?: string; drops?: string[]; image?: string
}

const data = arcData as unknown as { items: Item[]; bots: Bot[]; maps: unknown[]; trades: unknown[] }

const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unknown"]
const rarityLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Épico", Legendary: "Lendário", Unknown: "Desconhecido"
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
  const [query, setQuery] = useState("")
  const [rarity, setRarity] = useState("all")
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("value-desc")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [botFilter, setBotFilter] = useState<string | null>(null)

  const rarities = useMemo(() => rarityOrder.filter(r => data.items.some(i => getRarity(i) === r)), [])
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    data.items.forEach(i => counts.set(getType(i), (counts.get(getType(i)) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t)
  }, [])

  const filteredItems = useMemo(() => {
    const q = normalizeText(query)
    let items = data.items.filter(item => {
      if (rarity !== "all" && getRarity(item) !== rarity) return false
      if (type !== "all" && getType(item) !== type) return false
      if (botFilter) {
        const bot = data.bots.find(b => b.id === botFilter)
        if (!bot?.drops?.includes(item.id)) return false
      }
      if (!q) return true
      return normalizeText(`${item.name} ${item.nameEn ?? ""} ${item.type ?? ""} ${item.description ?? ""}`).includes(q)
    })
    if (sort === "value-desc") items.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    else if (sort === "value-asc") items.sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    else if (sort === "value-per-kg-desc") items.sort((a, b) => ((b.value ?? 0) / (b.weightKg ?? 1)) - ((a.value ?? 0) / (a.weightKg ?? 1)))
    else if (sort === "name-asc") items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    else if (sort === "type-asc") items.sort((a, b) => getType(a).localeCompare(getType(b), "pt-BR"))
    return items
  }, [query, rarity, type, sort, botFilter])

  const visibleBots = data.bots.slice(0, 6)

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
            <summary><span>Tipo</span><strong>{type === "all" ? "Todos" : type}</strong></summary>
            <div className="dropdown-menu">
              <button type="button" className={type === "all" ? "active" : ""} onClick={() => setType("all")}>Todos</button>
              {types.map(t => (
                <button key={t} type="button" className={type === t ? "active" : ""} onClick={() => setType(t)}>{t}</button>
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
              <p>Exibindo <strong>{filteredItems.length}</strong> de <strong>{data.items.length}</strong> itens</p>
              <h2 id="itemsTitle">Itens catalogados</h2>
            </div>
            <span>Sort: {sort.replace("-", " ")}</span>
          </div>
          <div className="item-grid">
            {filteredItems.length === 0 ? (
              <article className="item-card">
                <div className="item-body"><h3>Nenhum item encontrado</h3><p className="item-type">Ajuste busca ou filtros</p></div>
              </article>
            ) : filteredItems.map(item => {
              const r = getRarity(item)
              return (
                <article
                  key={item.id}
                  className="item-card"
                  style={{ "--rarity-color": rarityColors[r] } as React.CSSProperties}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe de ${item.name}`}
                  onClick={() => setSelectedItem(item)}
                  onKeyDown={e => e.key === "Enter" && setSelectedItem(item)}
                >
                  <div className="item-meta"><strong>{rarityLabels[r]}</strong><span>{item.isBlueprint ? "Blueprint" : getType(item)}</span></div>
                  <div className="item-media">
                    {item.image
                      ? <img src={`/${item.image}`} alt={item.name} loading="lazy" />
                      : <div className="placeholder">{item.name[0].toUpperCase()}</div>}
                  </div>
                  <div className="item-body">
                    <h3>{item.name}</h3>
                    <p className="item-type">{item.nameEn ?? getType(item)}</p>
                    <div className="item-value-row">
                      <span><small>Valor</small><strong>{formatNumber(item.value)}</strong></span>
                      {item.weightKg ? <span><small>Peso</small><strong>{item.weightKg} kg</strong></span> : null}
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
                    {bot.drops?.[0] ? <em>Drop: {data.items.find(i => i.id === bot.drops![0])?.name ?? bot.drops![0]}</em> : null}
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
                ? <img src={`/${selectedItem.image}`} alt={selectedItem.name} />
                : <div className="placeholder">{selectedItem.name[0]}</div>}
            </div>
            <div className="modal-content">
              <p className="modal-kicker">{getType(selectedItem)}</p>
              <h2>{selectedItem.name}</h2>
              {selectedItem.description && <p className="modal-description">{selectedItem.description}</p>}
              <div className="modal-stats">
                <span><small>Valor real</small><strong>{formatNumber(selectedItem.value)}</strong></span>
                <span><small>Peso</small><strong>{selectedItem.weightKg ? `${selectedItem.weightKg} kg` : "N/D"}</strong></span>
                <span><small>Stack</small><strong>{selectedItem.stackSize ? formatNumber(selectedItem.stackSize) : "Livre"}</strong></span>
                <span><small>Raridade</small><strong style={{ color: rarityColors[getRarity(selectedItem)] }}>{rarityLabels[getRarity(selectedItem)]}</strong></span>
              </div>
              <div className="modal-flags">
                {selectedItem.isCraftable && <span className="modal-flag">Craftável</span>}
                {selectedItem.isRecyclable && <span className="modal-flag">Reciclável</span>}
                {selectedItem.isWeapon && <span className="modal-flag">Arma</span>}
                {selectedItem.isBlueprint && <span className="modal-flag">Blueprint</span>}
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  )
}


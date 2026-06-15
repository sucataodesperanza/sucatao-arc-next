"use client"

import { getItemTypeLabel } from "@/lib/catalog"
import { rarityMetaLabels, type ItemsCatalog } from "@/lib/use-items-catalog"

export function CatalogFilters({ catalog }: { catalog: ItemsCatalog }) {
  const { query, setQuery, rarity, setRarity, type, setType, sort, setSort, rarities, types, showFavorites, setShowFavorites, botFilter, setBotFilter } = catalog

  return (
    <div className="catalog-filters">
      <label className="catalog-search">
        <input
          type="search"
          autoComplete="off"
          placeholder="Buscar itens por nome..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </label>

      <details className="catalog-dropdown">
        <summary>
          <span>Raridade</span>
          <strong>{rarity === "all" ? "Todos" : rarityMetaLabels[rarity] ?? rarity}</strong>
        </summary>
        <div className="catalog-dropdown-menu">
          <button type="button" className={rarity === "all" ? "active" : ""} onClick={() => setRarity("all")}>Todos</button>
          {rarities.map(r => (
            <button key={r} type="button" className={rarity === r ? "active" : ""} onClick={() => setRarity(r)}>{rarityMetaLabels[r]}</button>
          ))}
        </div>
      </details>

      <details className="catalog-dropdown">
        <summary>
          <span>Tipo</span>
          <strong>{type === "all" ? "Todos" : getItemTypeLabel(type)}</strong>
        </summary>
        <div className="catalog-dropdown-menu">
          <button type="button" className={type === "all" ? "active" : ""} onClick={() => setType("all")}>Todos</button>
          {types.map(t => (
            <button key={t} type="button" className={type === t ? "active" : ""} onClick={() => setType(t)}>{getItemTypeLabel(t)}</button>
          ))}
        </div>
      </details>

      <label className="catalog-sort">
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
        className={`catalog-favorite-toggle${showFavorites ? " active" : ""}`}
        onClick={() => setShowFavorites(v => !v)}
      >
        Só favoritos
      </button>

      {botFilter && (
        <button type="button" className="catalog-favorite-toggle active" onClick={() => setBotFilter(null)}>
          Limpar filtro ARC
        </button>
      )}
    </div>
  )
}

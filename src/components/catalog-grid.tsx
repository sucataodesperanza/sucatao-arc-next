"use client"

import { Banknote, Coins, Heart, ShoppingCart } from "lucide-react"
import { getItemTypeLabel } from "@/lib/catalog"
import { formatNumber, getRarity, getType, rarityColors, rarityMetaLabels, resolveImage, type ItemsCatalog } from "@/lib/use-items-catalog"

export function CatalogGrid({ catalog, className, pinnedFirst }: { catalog: ItemsCatalog; className?: string; pinnedFirst?: React.ReactNode }) {
  const { filteredItems, loadingCatalog, favorites, toggleFavorite, setSelectedItem } = catalog

  if (loadingCatalog) {
    return <p className="catalog-empty">Carregando catálogo...</p>
  }

  if (filteredItems.length === 0 && !pinnedFirst) {
    return <p className="catalog-empty">Nenhum item encontrado. Ajuste a busca ou os filtros.</p>
  }

  return (
    <div className={`store-highlight-grid${className ? ` ${className}` : ""}`}>
      {pinnedFirst}
      {filteredItems.map(item => {
        const r = getRarity(item)
        const isFavorite = favorites.has(item.id)
        return (
          <article
            key={item.id}
            className={`store-highlight-card${item.quantity === 0 ? " sold-out" : ""}`}
            style={{ "--rarity-color": rarityColors[r] } as React.CSSProperties}
            tabIndex={0}
            role="button"
            aria-label={`Abrir detalhe de ${item.name}`}
            onClick={() => setSelectedItem(item)}
            onKeyDown={e => { if (e.key === "Enter") setSelectedItem(item) }}
          >
            <div className="store-highlight-media">
              {item.image
                ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
                : <div className="placeholder">{item.name[0]?.toUpperCase()}</div>}
              <span className="store-highlight-badge">{rarityMetaLabels[r]}</span>
              <button
                type="button"
                className={`store-highlight-favorite${isFavorite ? " active" : ""}`}
                aria-label="Favoritar"
                onClick={e => toggleFavorite(item.id, e)}
              >
                <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
              </button>
              {item.quantity === 0 && <span className="store-highlight-soldout">Esgotado</span>}
            </div>
            <div className="store-highlight-body">
              <p className="store-highlight-type">{getItemTypeLabel(getType(item))}</p>
              <h3>{item.name}</h3>
              <div className="store-highlight-footer">
                <span className="store-highlight-price">
                  <span className="store-highlight-price-cash">
                    <Banknote size={14} />
                    R$ {formatNumber(item.priceCash ?? item.value)}
                  </span>
                  <span className="store-highlight-price-points">
                    <Coins size={14} />
                    {formatNumber(item.pricePoints ?? Math.round((item.value ?? 0) * 24))}
                  </span>
                </span>
                <button
                  type="button"
                  className="store-highlight-cart"
                  disabled={item.quantity === 0}
                  tabIndex={-1}
                  aria-hidden
                >
                  <ShoppingCart size={14} />
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

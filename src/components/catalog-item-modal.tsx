"use client"

import { formatNumber, getRarity, getType, rarityColors, rarityMetaLabels, resolveImage, type ItemsCatalog } from "@/lib/use-items-catalog"

function formatCash(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
import { getItemTypeLabel } from "@/lib/catalog"

export function CatalogItemModal({ catalog }: { catalog: ItemsCatalog }) {
  const { selectedItem, setSelectedItem, userId, points, handleAddToCart } = catalog
  if (!selectedItem) return null

  const r = getRarity(selectedItem)

  return (
    <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
      <article className="catalog-modal" role="dialog" aria-modal onClick={e => e.stopPropagation()}>
        <button className="catalog-modal-close" type="button" aria-label="Fechar detalhe" onClick={() => setSelectedItem(null)}>×</button>
        <div className="catalog-modal-media">
          {selectedItem.image
            ? <img src={resolveImage(selectedItem.image)} alt={selectedItem.name} />
            : <div className="placeholder">{selectedItem.name[0]}</div>}
        </div>
        <div className="catalog-modal-content">
          <p className="catalog-modal-kicker" style={{ color: rarityColors[r] }}>
            {rarityMetaLabels[r]} // {getItemTypeLabel(getType(selectedItem))}
          </p>
          <h2>{selectedItem.name}</h2>
          {selectedItem.description && <p className="catalog-modal-description">{selectedItem.description}</p>}
          <div className="catalog-modal-stats">
            <span><small>Valor real</small><strong>R$ {formatCash(selectedItem.priceCash ?? selectedItem.value)}</strong></span>
            <span><small>Pontos do site</small><strong>{formatNumber(selectedItem.pricePoints ?? Math.round((selectedItem.value ?? 0) * 24))}</strong></span>
            <span><small>Peso</small><strong>{selectedItem.weightKg ? `${selectedItem.weightKg} kg` : "N/D"}</strong></span>
            <span><small>Stack</small><strong>{selectedItem.stackSize ? formatNumber(selectedItem.stackSize) : "Livre"}</strong></span>
          </div>
          <div className="catalog-modal-actions">
            <button type="button" disabled={selectedItem.quantity === 0} onClick={() => handleAddToCart(selectedItem, "points")}>
              Resgatar com pontos
            </button>
            <button type="button" className="cash" disabled={selectedItem.quantity === 0} onClick={() => handleAddToCart(selectedItem, "cash")}>
              Comprar com saldo real
            </button>
          </div>
          {selectedItem.quantity === 0 && (
            <p className="catalog-modal-status warn">Item esgotado no momento.</p>
          )}
          {userId ? (
            <p className="catalog-modal-status">Seus pontos do site: <strong>{formatNumber(points)}</strong></p>
          ) : (
            <p className="catalog-modal-status">Entre em uma conta local para salvar compras e resgates.</p>
          )}
          <div className="catalog-modal-flags">
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
  )
}

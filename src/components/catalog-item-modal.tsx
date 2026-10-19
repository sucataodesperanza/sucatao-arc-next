"use client"

import { formatNumber, getRarity, getType, rarityColors, rarityMetaLabels, resolveImage, type ItemsCatalog } from "@/lib/use-items-catalog"

function formatCash(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
import { getItemTypeLabel } from "@/lib/catalog"
import { saleStackSize, stackSaleOffer } from "@/lib/stack-sales"

export function CatalogItemModal({ catalog, stackSales=false }: { catalog: ItemsCatalog; stackSales?:boolean }) {
  const { selectedItem, setSelectedItem, userId, points, handleAddToCart } = catalog
  if (!selectedItem) return null

  const r = getRarity(selectedItem)
  const size=stackSales?saleStackSize(selectedItem):1
  const offer=stackSales?stackSaleOffer(selectedItem):selectedItem
  const unavailable=stackSales?(!offer || (offer.quantity??0)<1):selectedItem.quantity===0

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
          {stackSales&&<p className="catalog-modal-description">{size?(size>1?`Venda por stack completo de ${size} unidades. Os valores abaixo são do stack inteiro.`:"Este item não empilha. Venda por unidade."):"O tamanho da pilha ainda não foi confirmado para este item."}</p>}
          {selectedItem.description && <p className="catalog-modal-description">{selectedItem.description}</p>}
          <div className="catalog-modal-stats">
            <span><small>{stackSales&&size&&size>1?"Valor do stack":"Valor real"}</small><strong>R$ {offer?formatCash(offer.priceCash ?? offer.value):"—"}</strong></span>
            <span><small>Pontos do site</small><strong>{offer?formatNumber(offer.pricePoints ?? Math.round((offer.value ?? 0) * 24)):"—"}</strong></span>
            <span><small>{stackSales&&size&&size>1?"Peso do stack":"Peso"}</small><strong>{offer?.weightKg ? `${offer.weightKg} kg` : "N/D"}</strong></span>
            <span><small>Stack</small><strong>{stackSales?(size?formatNumber(size):"Não confirmado"):(selectedItem.stackSize?formatNumber(selectedItem.stackSize):"Livre")}</strong></span>
          </div>
          <div className="catalog-modal-actions">
            <button type="button" disabled={unavailable || (stackSales&&!offer?.pricePoints)} onClick={() => {if(offer)handleAddToCart(offer, "points")}}>
              {stackSales&&size&&size>1?"Resgatar 1 stack com pontos":"Resgatar com pontos"}
            </button>
            <button type="button" className="cash" disabled={unavailable || (stackSales&&!offer?.priceCash)} onClick={() => {if(offer)handleAddToCart(offer, "cash")}}>
              {stackSales&&size&&size>1?"Comprar 1 stack com saldo real":"Comprar com saldo real"}
            </button>
          </div>
          {unavailable && (
            <p className="catalog-modal-status warn">{!size?"Compra indisponível até confirmar o tamanho da pilha.":stackSales&&size>1?"Sem estoque para um stack completo no momento.":"Item esgotado no momento."}</p>
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

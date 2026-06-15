"use client"

import { ArcIntelPanel } from "@/components/arc-intel-panel"
import { CatalogFilters } from "@/components/catalog-filters"
import { CatalogGrid } from "@/components/catalog-grid"
import { CatalogItemModal } from "@/components/catalog-item-modal"
import { useItemsCatalog } from "@/lib/use-items-catalog"

export default function ItensPage() {
  const catalog = useItemsCatalog()

  return (
    <div className="catalog-page">
      <h1 className="page-title">Itens</h1>

      <CatalogFilters catalog={catalog} />

      <div className="catalog-layout">
        <section aria-labelledby="itemsTitle">
          <div className="store-section-head">
            <h2 id="itemsTitle">Itens catalogados</h2>
            <span>Exibindo {catalog.filteredItems.length} de {catalog.catalogItems.length}</span>
          </div>
          <CatalogGrid catalog={catalog} />
        </section>

        <aside className="catalog-aside" aria-label="Intel lateral">
          <ArcIntelPanel catalog={catalog} />
          <p className="catalog-source-note">
            Dados importados do pacote comunitário RaidTheory/arcraiders-data Tech Test 2. Use com atribuição para RaidTheory/arcraiders-data e arctracker.io.
          </p>
        </aside>
      </div>

      <CatalogItemModal catalog={catalog} />
    </div>
  )
}

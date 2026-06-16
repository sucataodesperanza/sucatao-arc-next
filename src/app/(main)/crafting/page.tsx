"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import arcData from "@/data/arc-data"
import { getItemTypeLabel } from "@/lib/catalog"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import type { CraftingItem } from "@/app/api/crafting/route"

type LocalItem = { id: string; name: string; type?: string; rarity?: string; image?: string }
const data = arcData as unknown as { items: LocalItem[] }
const MATERIAL_TYPES = ["Raw Material", "Topside Material", "Refined Material", "Material", "Basic Material", "Advanced Material", "Nature"]
const localMaterials = data.items.filter(i => MATERIAL_TYPES.includes(i.type ?? ""))

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function rarityColor(rarity?: string | null) { return rarityColors[rarity ?? ""] ?? rarityColors.Unknown }
function rarityLabel(rarity?: string | null) { return rarityMetaLabels[rarity ?? ""] ?? rarity ?? "Craftável" }

function translateWorkbench(wb: string): string {
  return wb
    .replace(/\bBasic Bench\b/gi, "Bancada Básica")
    .replace(/\bEquipment Bench\b/gi, "Bancada de Equipamento")
    .replace(/\bExplosives? Bench\b/gi, "Bancada de Explosivos")
    .replace(/\bGear Bench\b/gi, "Bancada de Equipamentos")
    .replace(/\bGunsmith\b/gi, "Armeiro")
    .replace(/\bMed Stations?\b/gi, "Estação Médica")
    .replace(/\bMedical Lab\b/gi, "Laboratório Médico")
    .replace(/\bRefiner\b/gi, "Refinador")
    .replace(/\bUtility Bench\b/gi, "Bancada Utilitária")
    .replace(/\bUtility Station\b/gi, "Estação Utilitária")
    .replace(/\bWeapon Bench\b/gi, "Bancada de Armas")
    .replace(/\bWorkbench\b/gi, "Bancada")
    .replace(/\bor\b/gi, "ou")
}

export default function CraftingPage() {
  const [craftable, setCraftable] = useState<CraftingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [workbench, setWorkbench] = useState("all")
  const [selected, setSelected] = useState<CraftingItem | null>(null)

  useEffect(() => {
    fetch("/api/crafting")
      .then(r => r.json())
      .then(b => setCraftable(b.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const workbenches = useMemo(() => [...new Set(craftable.map(i => i.workbench).filter(Boolean) as string[])].sort(), [craftable])

  const q = normalizeText(query)
  const filteredCraftable = useMemo(() => craftable.filter(i => {
    if (workbench !== "all" && i.workbench !== workbench) return false
    if (!q) return true
    return normalizeText(`${i.name} ${i.item_type ?? ""} ${i.workbench ?? ""}`).includes(q)
  }), [craftable, workbench, q])

  const filteredMaterials = useMemo(() =>
    !q ? localMaterials : localMaterials.filter(i => normalizeText(`${i.name} ${i.type ?? ""}`).includes(q))
  , [q])

  return (
    <div className="catalog-page">
      <h1 className="page-title">Crafting</h1>

      <div className="catalog-filters">
        <label className="catalog-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Buscar item, material ou bancada..."
            autoComplete="off"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>
        {workbenches.length > 0 && (
          <label className="crafting-bench-select">
            <select value={workbench} onChange={e => setWorkbench(e.target.value)}>
              <option value="all">Todas as bancadas</option>
              {workbenches.map(wb => (
                <option key={wb} value={wb}>{translateWorkbench(wb)}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="crafting-layout">
        <section>
          <div className="store-section-head">
            <h2>Materiais</h2>
            <span>Exibindo {filteredMaterials.length} de {localMaterials.length}</span>
          </div>
          <div className="store-highlight-grid">
            {filteredMaterials.length === 0
              ? <p className="catalog-empty">Nenhum material encontrado.</p>
              : filteredMaterials.map(item => (
                <article key={item.id} className="store-highlight-card" style={{ "--rarity-color": rarityColor(item.rarity) } as React.CSSProperties}>
                  <div className="store-highlight-media">
                    {item.image
                      ? <img src={item.image.startsWith("http") ? item.image : `/${item.image}`} alt={item.name} loading="lazy" />
                      : <div className="placeholder">{item.name[0]}</div>}
                    <span className="store-highlight-badge">Material</span>
                  </div>
                  <div className="store-highlight-body">
                    <p className="store-highlight-type">{getItemTypeLabel(item.type)}</p>
                    <h3>{item.name}</h3>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section>
          <div className="store-section-head">
            <h2>Craftáveis</h2>
            <span>Exibindo {filteredCraftable.length} de {craftable.length}</span>
          </div>
          {loading ? (
            <p className="catalog-empty">Carregando...</p>
          ) : filteredCraftable.length === 0 ? (
            <p className="catalog-empty">Nenhum item encontrado. Verifique se o catálogo foi sincronizado.</p>
          ) : (
            <div className="store-highlight-grid">
              {filteredCraftable.map(item => (
                <article
                  key={item.id}
                  className="store-highlight-card"
                  style={{ "--rarity-color": rarityColor(item.rarity), cursor: "pointer" } as React.CSSProperties}
                  onClick={() => setSelected(item)}
                  tabIndex={0}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && setSelected(item)}
                  role="button"
                  aria-label={`Ver receita de ${item.name}`}
                >
                  <div className="store-highlight-media">
                    {item.icon_url
                      ? <img src={item.icon_url} alt={item.name} loading="lazy" />
                      : <div className="placeholder">{item.name[0]}</div>}
                    <span className="store-highlight-badge">{rarityLabel(item.rarity)}</span>
                  </div>
                  <div className="store-highlight-body">
                    <p className="store-highlight-type">{item.workbench ? translateWorkbench(item.workbench) : getItemTypeLabel(item.item_type)}</p>
                    <h3>{item.name}</h3>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="catalog-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="catalog-modal-close"
              onClick={() => setSelected(null)}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className="catalog-modal-media" style={{ "--rarity-color": rarityColor(selected.rarity) } as React.CSSProperties}>
              {selected.icon_url
                ? <img src={selected.icon_url} alt={selected.name} />
                : <div className="placeholder">{selected.name[0]}</div>}
            </div>

            <div className="catalog-modal-content">
              <p className="catalog-modal-kicker" style={{ color: rarityColor(selected.rarity) }}>{rarityLabel(selected.rarity)}</p>
              <h2>{selected.name}</h2>

              {selected.workbench && (
                <div className="arcpedia-modal-section">
                  <p className="arcpedia-modal-label">Bancada</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{translateWorkbench(selected.workbench)}</p>
                </div>
              )}

              <div className="arcpedia-modal-section">
                <p className="arcpedia-modal-label">Ingredientes</p>
                {selected.recipe && selected.recipe.length > 0 ? (
                  <div className="crafting-recipe-list">
                    {selected.recipe.map((r, i) => (
                      <div key={i} className="crafting-recipe-row">
                        <span className="crafting-recipe-qty">{r.qty}x</span>
                        <span>{r.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--gray-500)" }}>
                    Receita ainda não cadastrada.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

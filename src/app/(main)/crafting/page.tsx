"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Hammer, Package, Search, X } from "lucide-react"
import { getItemTypeLabel } from "@/lib/catalog"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import type { CraftingItem } from "@/app/api/crafting/route"
import type { MaterialRow } from "@/app/api/materials/route"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import MaterialDetailModal from "@/components/material-detail-modal"
import type { MaterialItem } from "@/components/material-detail-modal"
import "../../../styles/crafting.css"

const PANEL_KEY = "crafting-panel-open"

const MAT_TYPE_COLORS: Record<string, string> = {
  "Raw Material":      "#5fa8ff",
  "Basic Material":    "#5fa8ff",
  "Topside Material":  "#3df28b",
  "Nature":            "#3df28b",
  "Refined Material":  "#ffd400",
  "Advanced Material": "#ff6171",
  "Material":          "#c4cad3",
}

const MAT_TYPE_LABELS: Record<string, string> = {
  "Raw Material":      "Bruto",
  "Basic Material":    "Básico",
  "Topside Material":  "Superfície",
  "Nature":            "Natureza",
  "Refined Material":  "Refinado",
  "Advanced Material": "Avançado",
  "Material":          "Material",
}

function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }
function rarityColor(r?: string | null) { return rarityColors[r ?? ""] ?? rarityColors.Unknown }
function rarityLabel(r?: string | null) { return rarityMetaLabels[r ?? ""] ?? r ?? "Craftável" }
function matTypeColor(t?: string | null) { return MAT_TYPE_COLORS[t ?? ""] ?? "#c4cad3" }
function matTypeLabel(t?: string | null) { return MAT_TYPE_LABELS[t ?? ""] ?? t ?? "Material" }

function normalizeWorkbench(wb: string): string {
  return wb
    .replace(/\s+or\s+.+$/i, "")
    .replace(/\s+\d+\s*$/i, "")
    .replace(/\s+[IVX]+\s*$/i, "")
    .trim()
}

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
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [craftable, setCraftable] = useState<CraftingItem[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(true)
  const [loadingCraftable, setLoadingCraftable] = useState(true)
  const [query, setQuery] = useState("")
  const [workbenchGroup, setWorkbenchGroup] = useState("all")
  const [filterMaterial, setFilterMaterial] = useState<string | null>(null)
  const [materialDetail, setMaterialDetail] = useState<MaterialItem | null>(null)
  const [selected, setSelected] = useState<CraftingItem | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  useEffect(() => {
    fetch("/api/materials")
      .then(r => r.json())
      .then(b => setMaterials(b.items ?? []))
      .finally(() => setLoadingMaterials(false))

    fetch("/api/crafting")
      .then(r => r.json())
      .then(b => setCraftable(b.items ?? []))
      .finally(() => setLoadingCraftable(false))
  }, [])

  const workbenchGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const item of craftable) {
      if (!item.workbench) continue
      const groupName = translateWorkbench(normalizeWorkbench(item.workbench))
      if (!groups[groupName]) groups[groupName] = []
      if (!groups[groupName].includes(item.workbench)) groups[groupName].push(item.workbench)
    }
    return groups
  }, [craftable])

  const workbenchGroupNames = useMemo(() => Object.keys(workbenchGroups).sort(), [workbenchGroups])

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of craftable) {
      if (!item.workbench) continue
      const groupName = translateWorkbench(normalizeWorkbench(item.workbench))
      counts[groupName] = (counts[groupName] ?? 0) + 1
    }
    return counts
  }, [craftable])

  const q = normalizeText(query)

  const filteredCraftable = useMemo(() => craftable.filter(i => {
    if (workbenchGroup !== "all") {
      const groupRaws = workbenchGroups[workbenchGroup] ?? []
      if (!i.workbench || !groupRaws.includes(i.workbench)) return false
    }
    if (filterMaterial) {
      if (!i.recipe?.some(r => normalizeText(r.name) === normalizeText(filterMaterial))) return false
    }
    if (!q) return true
    return normalizeText(`${i.name} ${i.item_type ?? ""} ${i.workbench ?? ""}`).includes(q)
  }), [craftable, workbenchGroup, workbenchGroups, filterMaterial, q])

  const filteredMaterials = useMemo(() =>
    !q ? materials : materials.filter(i => normalizeText(`${i.name} ${i.item_type ?? ""}`).includes(q))
  , [materials, q])

  const hasActiveFilter = workbenchGroup !== "all" || filterMaterial !== null
  const loading = loadingMaterials || loadingCraftable

  return (
    <div className={`crafting-page${panelOpen ? "" : " crafting-page--panel-closed"}`}>
      <div className={`crafting-page-layout${panelOpen ? "" : " crafting-page-layout--no-panel"}`}>
        <div className="crafting-main">
          <div className="crafting-topbar">
            <h1 className="page-title">Crafting</h1>
            <div className="crafting-stats-bar">
              <span><strong>{materials.length}</strong> materiais</span>
              <span><strong>{craftable.length}</strong> craftáveis</span>
              <span><strong>{workbenchGroupNames.length}</strong> bancadas</span>
            </div>
          </div>

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
            {hasActiveFilter && (
              <button
                type="button"
                className="crafting-clear-filters"
                onClick={() => { setWorkbenchGroup("all"); setFilterMaterial(null) }}
              >
                <X size={13} />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="crafting-layout">
            <section className="crafting-materials-section">
              <div className="store-section-head crafting-section-head">
                <div className="crafting-section-title">
                  <Package size={16} />
                  <h2>Materiais</h2>
                </div>
                <span>{filteredMaterials.length} de {materials.length}</span>
              </div>
              {filterMaterial && (
                <p className="crafting-filter-hint">
                  Mostrando craftáveis que usam <strong>{filterMaterial}</strong>
                </p>
              )}
              {loadingMaterials ? (
                <p className="catalog-empty">Carregando...</p>
              ) : filteredMaterials.length === 0 ? (
                <p className="catalog-empty">Nenhum material encontrado.</p>
              ) : (
                <div className="store-highlight-grid">
                  {filteredMaterials.map(item => (
                    <article
                      key={item.id}
                      className={`store-highlight-card${filterMaterial === item.name ? " crafting-material-selected" : ""}`}
                      style={{ "--rarity-color": matTypeColor(item.item_type), cursor: "pointer" } as React.CSSProperties}
                      onClick={() => setMaterialDetail(item as MaterialItem)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => (e.key === "Enter" || e.key === " ") && setMaterialDetail(item as MaterialItem)}
                      aria-label={`Ver detalhes de ${item.name}`}
                    >
                      <div className="store-highlight-media">
                        {item.icon_url
                          ? <img src={item.icon_url} alt={item.name} loading="lazy" />
                          : <div className="placeholder">{item.name[0]}</div>}
                        <span className="store-highlight-badge">{matTypeLabel(item.item_type)}</span>
                      </div>
                      <div className="store-highlight-body">
                        <p className="store-highlight-type">{getItemTypeLabel(item.item_type)}</p>
                        <h3>{item.name}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="crafting-craftables-section">
              <div className="store-section-head crafting-section-head">
                <div className="crafting-section-title">
                  <Hammer size={16} />
                  <h2>Craftáveis</h2>
                  {workbenchGroup !== "all" && (
                    <span className="crafting-active-filter">{workbenchGroup}</span>
                  )}
                </div>
                <span>{filteredCraftable.length} de {craftable.length}</span>
              </div>
              {loadingCraftable ? (
                <p className="catalog-empty">Carregando...</p>
              ) : filteredCraftable.length === 0 ? (
                <p className="catalog-empty">Nenhum item encontrado com os filtros ativos.</p>
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
                        {item.recipe && item.recipe.length > 0 && (
                          <span className="crafting-ingredient-count">{item.recipe.length} ingrediente{item.recipe.length !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de crafting">
          <SidePanelUserHeader onClose={() => setPanel(false)} />

          {workbenchGroupNames.length > 0 && (
            <div className="store-side-card">
              <div className="store-side-head">
                <h2>Bancadas</h2>
              </div>
              <div className="store-side-list">
                {workbenchGroupNames.map(group => (
                  <button
                    key={group}
                    type="button"
                    className={`store-side-item-button${workbenchGroup === group ? " active" : ""}`}
                    onClick={() => setWorkbenchGroup(workbenchGroup === group ? "all" : group)}
                  >
                    <Hammer size={15} style={{ flexShrink: 0 }} />
                    <div className="store-side-info">
                      <strong>{group}</strong>
                      <span>{groupCounts[group] ?? 0} itens</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
        <ChevronLeft size={16} />
        <span>Painel</span>
      </button>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="catalog-modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="catalog-modal-close" onClick={() => setSelected(null)} aria-label="Fechar">×</button>
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
                  <p style={{ margin: 0, fontSize: 13, color: "var(--gray-500)" }}>Receita ainda não cadastrada.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <MaterialDetailModal
        item={materialDetail}
        onClose={() => setMaterialDetail(null)}
        onFilterBy={name => { setFilterMaterial(name); setMaterialDetail(null) }}
      />
    </div>
  )
}

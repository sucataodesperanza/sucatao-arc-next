"use client"

import { useEffect, useState } from "react"
import { Hammer, Package, Scale, Zap, Recycle, Wrench, Search, ShieldAlert } from "lucide-react"
import { rarityColors, rarityMetaLabels } from "@/lib/use-items-catalog"
import { createClient } from "@/lib/supabase/client"

export type MaterialItem = {
  id: string
  name: string
  item_type?: string | null
  rarity?: string | null
  icon_url?: string | null
  description?: string | null
  value?: number | null
  weight_kg?: number | null
  stack_size?: number | null
}

type ArcRow         = { id: string; name: string; threat?: string | null; icon_url?: string | null; drops?: string[] | null }
type CraftableUsage = { id: string; name: string; icon_url: string | null; rarity: string | null }
type ItemSource     = { qty: number; name: string }
type ImageEntry     = { name: string; icon_url: string | null; rarity: string | null; threat: string | null }
type ImageMap       = Record<string, ImageEntry>

type ItemDetails = {
  obtained_from:    ItemSource[]
  recycled_into:    ItemSource[]
  recovered_into:   ItemSource[]
  used_in_crafting: string[]
}

const EMPTY_DETAILS: ItemDetails = { obtained_from: [], recycled_into: [], recovered_into: [], used_in_crafting: [] }

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
  "Raw Material":      "Material Bruto",
  "Basic Material":    "Material Básico",
  "Topside Material":  "Material de Superfície",
  "Nature":            "Natureza",
  "Refined Material":  "Material Refinado",
  "Advanced Material": "Material Avançado",
  "Material":          "Material",
}
const THREAT_COLORS: Record<string, string> = {
  critical: "#ff6171",
  extreme:  "#ff6171",
  high:     "#ffd400",
  moderate: "#5fa8ff",
  low:      "#3df28b",
}

function rarityColor(r?: string | null) { return rarityColors[r ?? ""] ?? rarityColors.Unknown }
function rarityLabel(r?: string | null) { return rarityMetaLabels[r ?? ""] ?? r ?? "" }
function matColor(t?: string | null)    { return MAT_TYPE_COLORS[t ?? ""] ?? "#c4cad3" }
function matLabel(t?: string | null)    { return MAT_TYPE_LABELS[t ?? ""] ?? t ?? "Material" }

/* ── Card de item referenciado com cor de raridade ── */
function ItemRefCard({ name, iconUrl, accent, qty, badge }: {
  name: string
  iconUrl: string | null
  accent: string
  qty?: number
  badge?: string
}) {
  return (
    <div
      className="mat-ref-card"
      style={{ "--ref-accent": accent } as React.CSSProperties}
    >
      <div className="mat-ref-card-img">
        {iconUrl
          ? <img src={iconUrl} alt={name} />
          : <span>{name[0]?.toUpperCase()}</span>}
        {badge && <em className="mat-ref-card-badge">{badge}</em>}
      </div>
      <div className="mat-ref-card-body">
        {qty != null && <strong className="mat-ref-card-qty">{qty}×</strong>}
        <span className="mat-ref-card-name">{name}</span>
      </div>
    </div>
  )
}

/* ── Cabeçalho de seção ── */
function SectionHead({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="mat-section-head">
      <Icon size={13} style={{ color }} />
      <span style={{ color }}>{label}</span>
    </div>
  )
}

interface Props {
  item: MaterialItem | null
  onClose: () => void
  onFilterBy: (id: string, name: string) => void
}

export default function MaterialDetailModal({ item, onClose, onFilterBy }: Props) {
  const [craftableUsages, setCraftableUsages] = useState<CraftableUsage[]>([])
  const [details, setDetails]       = useState<ItemDetails>(EMPTY_DETAILS)
  const [droppedBy, setDroppedBy]   = useState<ArcRow[]>([])
  const [imageMap, setImageMap]     = useState<ImageMap>({})
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!item) {
      setCraftableUsages([]); setDetails(EMPTY_DETAILS)
      setDroppedBy([]); setImageMap({})
      return
    }

    setLoading(true)
    const supabase = createClient()

    Promise.all([
      supabase
        .from("catalog_items")
        .select("id, name, icon_url, rarity")
        .filter("recipe", "cs", JSON.stringify([{ name: item.name }]))
        .then(({ data }) => setCraftableUsages((data as CraftableUsage[]) ?? [])),

      fetch(`/api/items/${encodeURIComponent(item.id)}`)
        .then(r => r.json())
        .then((d: ItemDetails) => setDetails(d))
        .catch(() => setDetails(EMPTY_DETAILS)),

      supabase
        .from("arcs")
        .select("id, name, threat, icon_url, drops")
        .eq("active", true)
        .contains("drops", JSON.stringify([item.id]))
        .then(({ data }) => setDroppedBy((data as ArcRow[]) ?? [])),
    ])
    .then(async () => {
      const det: ItemDetails = await fetch(`/api/items/${encodeURIComponent(item.id)}`).then(r => r.json()).catch(() => EMPTY_DETAILS)
      setDetails(det)
      const allNames = [
        ...det.obtained_from.map((s: ItemSource) => s.name),
        ...det.recycled_into.map((s: ItemSource) => s.name),
        ...det.recovered_into.map((s: ItemSource) => s.name),
        ...(det.used_in_crafting as string[]),
      ]
      if (allNames.length > 0) {
        const res = await fetch("/api/items/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [...new Set(allNames)] }),
        }).then(r => r.json()).catch(() => ({ images: [] }))
        const map: ImageMap = {}
        for (const e of res.images ?? []) map[e.name] = e
        setImageMap(map)
      }
    })
    .finally(() => setLoading(false))
  }, [item?.id])

  if (!item) return null

  const typeColor  = matColor(item.item_type)
  const itemRarity = item.rarity ?? "Unknown"

  const autoCraftableNames = new Set(craftableUsages.map(c => c.name))
  const manualOnly = details.used_in_crafting.filter(n => !autoCraftableNames.has(n))

  const hasObtained  = details.obtained_from.length > 0 || droppedBy.length > 0
  const hasRecycled  = details.recycled_into.length > 0
  const hasRecovered = details.recovered_into.length > 0
  const hasUsed      = craftableUsages.length > 0 || manualOnly.length > 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="catalog-modal material-detail-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Fechar">×</button>

        {/* Imagem */}
        <div className="catalog-modal-media mat-modal-media" style={{ "--rarity-color": rarityColor(itemRarity) } as React.CSSProperties}>
          {item.icon_url
            ? <img src={item.icon_url} alt={item.name} />
            : <div className="placeholder">{item.name[0]}</div>}
        </div>

        {/* Conteúdo */}
        <div className="catalog-modal-content mat-modal-content">

          {/* Badges */}
          <div className="material-detail-badges">
            <span className="mat-type-chip" style={{ color: typeColor, borderColor: `color-mix(in srgb, ${typeColor} 30%, transparent)`, background: `color-mix(in srgb, ${typeColor} 8%, transparent)` }}>
              {matLabel(item.item_type)}
            </span>
            {item.rarity && (
              <span className="mat-rarity-chip" style={{ color: rarityColor(itemRarity), borderColor: `color-mix(in srgb, ${rarityColor(itemRarity)} 30%, transparent)`, background: `color-mix(in srgb, ${rarityColor(itemRarity)} 8%, transparent)` }}>
                {rarityLabel(itemRarity)}
              </span>
            )}
          </div>

          <h2 className="material-detail-name">{item.name}</h2>

          {item.description && <p className="material-detail-desc">{item.description}</p>}

          {/* Stats */}
          <div className="mat-stats-row">
            {item.weight_kg != null && <div className="mat-stat"><Scale size={12} />{item.weight_kg} kg</div>}
            {item.value     != null && <div className="mat-stat"><Zap size={12} />{item.value} moedas</div>}
            {item.stack_size != null && <div className="mat-stat"><Package size={12} />Pilha {item.stack_size}</div>}
          </div>

          {/* ── Seções ── */}

          {/* Pode ser obtido de */}
          <div className="mat-section">
            <SectionHead icon={Search} label="Pode ser obtido de" color="#3df28b" />
            {loading ? (
              <p className="material-detail-empty">Carregando...</p>
            ) : details.obtained_from.length > 0 ? (
              <div className="mat-ref-grid">
                {details.obtained_from.map((src, i) => {
                  const entry = imageMap[src.name]
                  return (
                    <ItemRefCard key={i} name={src.name} qty={src.qty}
                      iconUrl={entry?.icon_url ?? null}
                      accent={entry?.rarity ? rarityColor(entry.rarity) : "#3df28b"}
                      badge={entry?.rarity ? rarityLabel(entry.rarity) : undefined}
                    />
                  )
                })}
              </div>
            ) : droppedBy.length > 0 ? (
              <div className="mat-ref-grid">
                {droppedBy.map(arc => {
                  const threatKey = arc.threat?.toLowerCase() ?? ""
                  const accent    = THREAT_COLORS[threatKey] ?? "#6f7785"
                  return (
                    <ItemRefCard key={arc.id} name={arc.name}
                      iconUrl={arc.icon_url ?? null}
                      accent={accent}
                      badge={arc.threat ?? undefined}
                    />
                  )
                })}
              </div>
            ) : (
              <p className="material-detail-empty">Nenhuma fonte registrada.</p>
            )}
          </div>

          {/* Reciclado em */}
          <div className="mat-section">
            <SectionHead icon={Recycle} label="Reciclado em" color="#5fa8ff" />
            {loading ? <p className="material-detail-empty">Carregando...</p>
            : details.recycled_into.length > 0 ? (
              <div className="mat-ref-grid">
                {details.recycled_into.map((src, i) => {
                  const entry = imageMap[src.name]
                  return (
                    <ItemRefCard key={i} name={src.name} qty={src.qty}
                      iconUrl={entry?.icon_url ?? null}
                      accent={entry?.rarity ? rarityColor(entry.rarity) : "#5fa8ff"}
                      badge={entry?.rarity ? rarityLabel(entry.rarity) : undefined}
                    />
                  )
                })}
              </div>
            ) : <p className="material-detail-empty">Dados não disponíveis.</p>}
          </div>

          {/* Recuperado em */}
          <div className="mat-section">
            <SectionHead icon={Wrench} label="Recuperado em" color="#00d9ff" />
            {loading ? <p className="material-detail-empty">Carregando...</p>
            : details.recovered_into.length > 0 ? (
              <div className="mat-ref-grid">
                {details.recovered_into.map((src, i) => {
                  const entry = imageMap[src.name]
                  return (
                    <ItemRefCard key={i} name={src.name} qty={src.qty}
                      iconUrl={entry?.icon_url ?? null}
                      accent={entry?.rarity ? rarityColor(entry.rarity) : "#00d9ff"}
                      badge={entry?.rarity ? rarityLabel(entry.rarity) : undefined}
                    />
                  )
                })}
              </div>
            ) : <p className="material-detail-empty">Dados não disponíveis.</p>}
          </div>

          {/* Usado na fabricação */}
          <div className="mat-section">
            <SectionHead icon={Hammer} label="Usado na fabricação" color="#ffd400" />
            {loading ? <p className="material-detail-empty">Carregando...</p>
            : hasUsed ? (
              <div className="mat-ref-grid">
                {craftableUsages.map(c => (
                  <ItemRefCard key={c.id} name={c.name}
                    iconUrl={c.icon_url}
                    accent={rarityColor(c.rarity)}
                    badge={c.rarity ? rarityLabel(c.rarity) : undefined}
                  />
                ))}
                {manualOnly.map((name, i) => {
                  const entry = imageMap[name]
                  return (
                    <ItemRefCard key={`m${i}`} name={name}
                      iconUrl={entry?.icon_url ?? null}
                      accent={entry?.rarity ? rarityColor(entry.rarity) : "#ffd400"}
                      badge={entry?.rarity ? rarityLabel(entry.rarity) : undefined}
                    />
                  )
                })}
              </div>
            ) : <p className="material-detail-empty">Nenhum craftável usa este material.</p>}
          </div>

          {/* Botão de filtro */}
          <button
            type="button"
            className="material-detail-filter-btn"
            onClick={() => { onFilterBy(item.id, item.name); onClose() }}
          >
            <ShieldAlert size={13} />
            Filtrar craftáveis que usam {item.name}
          </button>
        </div>
      </div>
    </div>
  )
}

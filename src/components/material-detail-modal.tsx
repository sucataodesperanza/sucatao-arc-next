"use client"

import { useEffect, useState } from "react"
import { Hammer, Package, Scale, Zap } from "lucide-react"
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

type ArcRow = { id: string; name: string; threat?: string | null; icon_url?: string | null; drops?: string[] | null }
type CraftableUsage = { id: string; name: string; icon_url: string | null; rarity: string | null; workbench: string | null }
type ItemSource = { qty: number; name: string }
type ItemDetails = { obtained_from: ItemSource[]; recycled_into: ItemSource[]; recovered_into: ItemSource[] }

const EMPTY_DETAILS: ItemDetails = { obtained_from: [], recycled_into: [], recovered_into: [] }

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

function rarityColor(r?: string | null) { return rarityColors[r ?? ""] ?? rarityColors.Unknown }
function rarityLabel(r?: string | null) { return rarityMetaLabels[r ?? ""] ?? r ?? "" }
function matColor(t?: string | null) { return MAT_TYPE_COLORS[t ?? ""] ?? "#c4cad3" }
function matLabel(t?: string | null) { return MAT_TYPE_LABELS[t ?? ""] ?? t ?? "Material" }

interface Props {
  item: MaterialItem | null
  onClose: () => void
  onFilterBy: (name: string) => void
}

export default function MaterialDetailModal({ item, onClose, onFilterBy }: Props) {
  const [craftableUsages, setCraftableUsages] = useState<CraftableUsage[]>([])
  const [details, setDetails] = useState<ItemDetails>(EMPTY_DETAILS)
  const [droppedBy, setDroppedBy] = useState<ArcRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!item) {
      setCraftableUsages([])
      setDetails(EMPTY_DETAILS)
      setDroppedBy([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    Promise.all([
      // Craftáveis que usam este material na receita
      supabase
        .from("catalog_items")
        .select("id, name, icon_url, rarity, workbench")
        .filter("recipe", "cs", JSON.stringify([{ name: item.name }]))
        .then(({ data }) => setCraftableUsages((data as CraftableUsage[]) ?? [])),

      // Campos editáveis pelo admin (obtained_from, recycled_into, recovered_into)
      fetch(`/api/items/${encodeURIComponent(item.id)}`)
        .then(r => r.json())
        .then((d: ItemDetails) => setDetails(d))
        .catch(() => setDetails(EMPTY_DETAILS)),

      // Bots que droppam este item (tabela arcs, campo drops contém o ID do catalog_items)
      supabase
        .from("arcs")
        .select("id, name, threat, icon_url, drops")
        .eq("active", true)
        .contains("drops", JSON.stringify([item.id]))
        .then(({ data }) => setDroppedBy((data as ArcRow[]) ?? [])),
    ]).finally(() => setLoading(false))
  }, [item?.id])

  if (!item) return null

  const typeColor = matColor(item.item_type)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="catalog-modal material-detail-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Fechar">×</button>

        {/* Imagem */}
        <div className="catalog-modal-media" style={{ "--rarity-color": typeColor } as React.CSSProperties}>
          {item.icon_url
            ? <img src={item.icon_url} alt={item.name} />
            : <div className="placeholder">{item.name[0]}</div>}
        </div>

        {/* Conteúdo */}
        <div className="catalog-modal-content">
          {/* Badges */}
          <div className="material-detail-badges">
            <span
              className="material-detail-type-badge"
              style={{ color: typeColor, borderColor: `color-mix(in srgb, ${typeColor} 35%, transparent)`, background: `color-mix(in srgb, ${typeColor} 10%, transparent)` }}
            >
              {matLabel(item.item_type)}
            </span>
            {item.rarity && (
              <span className="material-detail-rarity-badge" style={{ color: rarityColor(item.rarity) }}>
                {rarityLabel(item.rarity)}
              </span>
            )}
          </div>

          <h2 className="material-detail-name">{item.name}</h2>

          {item.description && (
            <p className="material-detail-desc">{item.description}</p>
          )}

          {/* Stats */}
          <div className="material-detail-stats">
            {item.weight_kg != null && (
              <div className="material-detail-stat">
                <Scale size={12} />
                <span>{item.weight_kg} kg</span>
              </div>
            )}
            {item.value != null && (
              <div className="material-detail-stat">
                <Zap size={12} />
                <span>{item.value} moedas</span>
              </div>
            )}
            {item.stack_size != null && (
              <div className="material-detail-stat">
                <Package size={12} />
                <span>Pilha {item.stack_size}</span>
              </div>
            )}
          </div>

          {/* Pode ser obtido de — DB first, fallback para arcs */}
          <div className="arcpedia-modal-section">
            <p className="arcpedia-modal-label">Pode ser obtido de</p>
            {loading ? (
              <p className="material-detail-empty">Carregando...</p>
            ) : details.obtained_from.length > 0 ? (
              <div className="material-detail-craftables">
                {details.obtained_from.map((src, i) => (
                  <div key={i} className="material-detail-craftable">
                    <span style={{ minWidth: 28, textAlign: "center", fontWeight: 950, color: "var(--yellow)", fontSize: 11 }}>{src.qty}×</span>
                    <span>{src.name}</span>
                  </div>
                ))}
              </div>
            ) : droppedBy.length > 0 ? (
              <div className="material-detail-bots">
                {droppedBy.map(arc => (
                  <div key={arc.id} className="material-detail-bot">
                    <div className="material-detail-bot-img">
                      {arc.icon_url
                        ? <img src={arc.icon_url} alt={arc.name} />
                        : <span>{arc.name[0]}</span>}
                    </div>
                    <span>{arc.name}</span>
                    {arc.threat && (
                      <em className={`material-detail-threat material-detail-threat--${arc.threat.toLowerCase()}`}>
                        {arc.threat}
                      </em>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="material-detail-empty">Nenhuma fonte registrada.</p>
            )}
          </div>

          {/* Reciclado em */}
          <div className="arcpedia-modal-section">
            <p className="arcpedia-modal-label">Reciclado em</p>
            {loading ? (
              <p className="material-detail-empty">Carregando...</p>
            ) : details.recycled_into.length > 0 ? (
              <div className="material-detail-craftables">
                {details.recycled_into.map((src, i) => (
                  <div key={i} className="material-detail-craftable">
                    <span style={{ minWidth: 28, textAlign: "center", fontWeight: 950, color: "var(--blue)", fontSize: 11 }}>{src.qty}×</span>
                    <span>{src.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="material-detail-empty">Dados não disponíveis.</p>
            )}
          </div>

          {/* Recuperado em */}
          <div className="arcpedia-modal-section">
            <p className="arcpedia-modal-label">Recuperado em</p>
            {loading ? (
              <p className="material-detail-empty">Carregando...</p>
            ) : details.recovered_into.length > 0 ? (
              <div className="material-detail-craftables">
                {details.recovered_into.map((src, i) => (
                  <div key={i} className="material-detail-craftable">
                    <span style={{ minWidth: 28, textAlign: "center", fontWeight: 950, color: "var(--green)", fontSize: 11 }}>{src.qty}×</span>
                    <span>{src.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="material-detail-empty">Dados não disponíveis.</p>
            )}
          </div>

          {/* Usado na fabricação */}
          <div className="arcpedia-modal-section">
            <p className="arcpedia-modal-label">Usado na fabricação</p>
            {loading ? (
              <p className="material-detail-empty">Carregando...</p>
            ) : craftableUsages.length > 0 ? (
              <div className="material-detail-craftables">
                {craftableUsages.map(c => (
                  <div key={c.id} className="material-detail-craftable" style={{ "--rarity-color": rarityColor(c.rarity) } as React.CSSProperties}>
                    {c.icon_url
                      ? <img src={c.icon_url} alt={c.name} />
                      : <div className="placeholder" style={{ width: 32, height: 32, fontSize: 13 }}>{c.name[0]}</div>}
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="material-detail-empty">Nenhum craftável usa este material.</p>
            )}
          </div>

          {/* Ação */}
          <div className="arcpedia-modal-section">
            <button
              type="button"
              className="material-detail-filter-btn"
              onClick={() => { onFilterBy(item.name); onClose() }}
            >
              <Hammer size={13} />
              Filtrar craftáveis que usam {item.name}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

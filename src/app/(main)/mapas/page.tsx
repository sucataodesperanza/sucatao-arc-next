"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, MapPin } from "lucide-react"
import arcData from "@/data/arc-data"
import { mapMarkers, markerCategories } from "@/data/map-markers"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/mapas.css"

type ArcMap = { id: string; name: string; label?: string; status?: string; description?: string; image?: string }
type Marker = { mapId: string; type: string; x: number; y: number; title: string; note?: string }

const data = arcData as unknown as { maps: ArcMap[] }
const markers = mapMarkers as Marker[]
const catLabels = markerCategories as Record<string, { label: string; color: string }>

const PANEL_KEY = "mapas-panel-open"

export default function MapasPage() {
  const [selectedMapId, setSelectedMapId]     = useState(data.maps[0]?.id ?? "")
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen]             = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  const selectedMap     = data.maps.find(m => m.id === selectedMapId)
  const visibleMarkers  = markers.filter(m => m.mapId === selectedMapId)
  const selectedMarker  = selectedMarkerId !== null ? visibleMarkers[selectedMarkerId] : null

  // Contagem por categoria
  const catCounts = visibleMarkers.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})

  function selectMap(id: string) {
    setSelectedMapId(id)
    setSelectedMarkerId(null)
  }

  return (
    <div className={`mapas-page${panelOpen ? "" : " mapas-page--panel-closed"}`}>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="mapas-main">

          {/* Topbar */}
          <div className="mapas-topbar">
            <h1 className="page-title">Mapas</h1>
            <div className="mapas-stats-bar">
              <span><strong>{data.maps.filter(m => m.status === "ready").length}</strong> disponíveis</span>
              <span><strong>{visibleMarkers.length}</strong> marcadores</span>
            </div>
          </div>

          {/* Browser: seletor + visualizador */}
          <div className="mapas-browser">

            {/* Seletor */}
            <nav className="mapas-selector" aria-label="Selecionar mapa">
              {data.maps.map(map => (
                <button
                  key={map.id}
                  type="button"
                  className={`mapas-map-item${map.id === selectedMapId ? " active" : ""}${map.status !== "ready" ? " pending" : ""}`}
                  onClick={() => selectMap(map.id)}
                >
                  <div className="mapas-map-item-info">
                    <strong>{map.name}</strong>
                    {map.label && <span>{map.label}</span>}
                  </div>
                  <span className={`mapas-status-dot${map.status === "ready" ? " ready" : " pending"}`} />
                </button>
              ))}
            </nav>

            {/* Visualizador */}
            <article className="mapas-viewer" aria-label={`Mapa: ${selectedMap?.name}`}>
              <div className="mapas-viewer-head">
                <div>
                  {selectedMap?.label && <p className="mapas-viewer-label">{selectedMap.label}</p>}
                  <h2 className="mapas-viewer-title">{selectedMap?.name ?? "Mapa"}</h2>
                </div>
                <span className={`mapas-badge${selectedMap?.status === "ready" ? " ready" : " pending"}`}>
                  {selectedMap?.status === "ready" ? "Disponível" : "Pendente"}
                </span>
              </div>

              <div className="mapas-viewer-media">
                {selectedMap?.image ? (
                  <div style={{ position: "relative", width: "100%", height: "100%" }}>
                    <img
                      src={`/${selectedMap.image}`}
                      alt={selectedMap.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                    />
                    {visibleMarkers.map((marker, i) => {
                      const cat = catLabels[marker.type]
                      const color = cat?.color ?? "#5fa8ff"
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedMarkerId(selectedMarkerId === i ? null : i)}
                          className={`mapas-ping${selectedMarkerId === i ? " active" : ""}`}
                          style={{
                            left: `${marker.x}%`,
                            top: `${marker.y}%`,
                            "--ping-color": color,
                          } as React.CSSProperties}
                          title={marker.title}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="mapas-no-image">
                    <MapPin size={32} style={{ color: "var(--gray-500)" }} />
                    <span>Imagem do mapa indisponível</span>
                  </div>
                )}
              </div>
            </article>
          </div>
        </div>

        {/* Painel lateral */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`}>
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          {/* Info do mapa */}
          <div className="mapas-panel-card" style={{ marginTop: 16 }}>
            <div className="mapas-panel-head">
              <span>{selectedMap?.label ?? "Mapa"}</span>
              <strong>{selectedMap?.name}</strong>
            </div>
            {selectedMap?.description && (
              <p className="mapas-panel-desc">{selectedMap.description}</p>
            )}
          </div>

          {/* Marcador selecionado */}
          {selectedMarker && (
            <div className="mapas-panel-card mapas-marker-detail" style={{ marginTop: 10 }}>
              <p
                className="mapas-marker-cat"
                style={{ color: catLabels[selectedMarker.type]?.color ?? "var(--blue)" }}
              >
                {catLabels[selectedMarker.type]?.label ?? selectedMarker.type}
              </p>
              <strong className="mapas-marker-title">{selectedMarker.title}</strong>
              {selectedMarker.note && (
                <p className="mapas-marker-note">{selectedMarker.note}</p>
              )}
            </div>
          )}

          {/* Categorias / contagem */}
          {Object.keys(catCounts).length > 0 && (
            <div className="mapas-panel-card" style={{ marginTop: 10 }}>
              <p className="mapas-panel-section-label">Marcadores — {visibleMarkers.length} total</p>
              <div className="mapas-cat-list">
                {Object.entries(catCounts).map(([type, count]) => {
                  const cat = catLabels[type]
                  return (
                    <div key={type} className="mapas-cat-row">
                      <span className="mapas-cat-dot" style={{ background: cat?.color ?? "#5fa8ff" }} />
                      <span className="mapas-cat-label">{cat?.label ?? type}</span>
                      <span className="mapas-cat-count">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista de marcadores */}
          {visibleMarkers.length > 0 && (
            <div className="mapas-panel-card" style={{ marginTop: 10 }}>
              <p className="mapas-panel-section-label">Lista de marcadores</p>
              <div className="mapas-marker-list">
                {visibleMarkers.map((m, i) => {
                  const cat = catLabels[m.type]
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`mapas-marker-row${selectedMarkerId === i ? " active" : ""}`}
                      onClick={() => setSelectedMarkerId(selectedMarkerId === i ? null : i)}
                      style={{ "--ping-color": cat?.color ?? "#5fa8ff" } as React.CSSProperties}
                    >
                      <span className="mapas-marker-row-dot" />
                      <span className="mapas-marker-row-name">{m.title}</span>
                      <span className="mapas-marker-row-cat">{cat?.label ?? m.type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      <button type="button" className="store-panel-reopen" onClick={() => setPanel(true)} aria-label="Abrir painel">
        <ChevronLeft size={16} />
        <span>Painel</span>
      </button>
    </div>
  )
}

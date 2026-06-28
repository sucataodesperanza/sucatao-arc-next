"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, MapPin } from "lucide-react"
import { markerCategories } from "@/data/map-markers"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/mapas.css"
import type { MapRecord, MapMarker } from "@/app/api/mapas/route"

const catLabels = markerCategories as Record<string, { label: string; color: string }>
const PANEL_KEY = "mapas-panel-open"

const CAT_ICONS: Record<string, string> = {
  loot:    "💰",
  extract: "🚀",
  key:     "🔑",
  danger:  "⚠️",
  route:   "🗺️",
}

export default function MapasPage() {
  const [maps, setMaps]                         = useState<MapRecord[]>([])
  const [markers, setMarkers]                   = useState<MapMarker[]>([])
  const [loading, setLoading]                   = useState(true)
  const [selectedMapId, setSelectedMapId]       = useState("")
  const [activeMarkerId, setActiveMarkerId]     = useState<string | null>(null)
  const [hoveredMarkerId, setHoveredMarkerId]   = useState<string | null>(null)
  const [panelOpen, setPanelOpen]               = useState(true)
  const imgRef                                  = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) setPanelOpen(stored === "true")
  }, [])

  function setPanel(val: boolean) {
    setPanelOpen(val)
    localStorage.setItem(PANEL_KEY, String(val))
  }

  useEffect(() => {
    fetch("/api/mapas")
      .then(r => r.json())
      .then(d => {
        setMaps(d.maps ?? [])
        setMarkers(d.markers ?? [])
        setSelectedMapId(d.maps?.[0]?.id ?? "")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const selectedMap    = maps.find(m => m.id === selectedMapId)
  const visibleMarkers = markers.filter(m => m.map_id === selectedMapId)
  const activeMarker   = visibleMarkers.find(m => m.id === activeMarkerId)

  const catCounts = visibleMarkers.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})

  function selectMap(id: string) {
    setSelectedMapId(id)
    setActiveMarkerId(null)
    setHoveredMarkerId(null)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--gray-500)" }}>
      Carregando mapas...
    </div>
  )

  return (
    <div className={`mapas-page${panelOpen ? "" : " mapas-page--panel-closed"}`} style={{ position: "relative" }}>
      {/* Overlay Em Breve */}
      <div style={{ position: "fixed", inset: 0, zIndex: 100, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(2,7,11,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--cyan)", opacity: 0.7 }}>Em Breve</span>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 950, textTransform: "uppercase", color: "var(--paper)" }}>Mapas</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--paper-dim)", textAlign: "center", maxWidth: 340 }}>O visualizador de mapas interativo está sendo preparado. Em breve você poderá explorar todos os mapas do jogo.</p>
      </div>
      <div className={`store-layout${panelOpen ? "" : " store-layout--no-panel"}`}>
        <div className="mapas-main">

          {/* Topbar */}
          <div className="mapas-topbar">
            <h1 className="page-title">Mapas</h1>
            <div className="mapas-stats-bar">
              <span><strong>{maps.filter(m => m.status === "ready").length}</strong> disponíveis</span>
              <span><strong>{visibleMarkers.length}</strong> marcadores</span>
            </div>
          </div>

          {/* Layout: sidebar de seleção + visualizador */}
          <div className="mapas-browser">

            {/* ── Sidebar de seleção ── */}
            <div className="mapas-selector">
              {maps.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`mapas-map-item${m.id === selectedMapId ? " active" : ""}${m.status !== "ready" ? " pending" : ""}`}
                  onClick={() => m.status === "ready" && selectMap(m.id)}
                  disabled={m.status !== "ready"}
                >
                  {/* Miniatura */}
                  <div className="mapas-map-thumb">
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.name} />
                    ) : (
                      <div className="mapas-map-thumb-placeholder">
                        <MapPin size={14} style={{ color: "var(--gray-500)" }} />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="mapas-map-item-info">
                    <strong>{m.name}</strong>
                    <span>{m.label}</span>
                  </div>
                  {/* Status dot */}
                  <div className={`mapas-status-dot ${m.status}`} />
                </button>
              ))}
            </div>

            {/* ── Visualizador ── */}
            {selectedMap && (
              <div className="mapas-viewer">
                {/* Header */}
                <div className="mapas-viewer-head">
                  <div>
                    <p className="mapas-viewer-label">{selectedMap.label}</p>
                    <h2 className="mapas-viewer-title">{selectedMap.name}</h2>
                  </div>
                  <span className={`mapas-badge ${selectedMap.status}`}>
                    {selectedMap.status === "ready" ? "Disponível" : "Em breve"}
                  </span>
                </div>

                {/* Mapa com marcadores */}
                {selectedMap.image_url ? (
                  <div className="mapas-viewer-media">
                    <img
                      ref={imgRef}
                      src={selectedMap.image_url}
                      alt={selectedMap.name}
                      draggable={false}
                    />
                    {/* Pinos */}
                    {visibleMarkers.map(marker => {
                      const color = catLabels[marker.type]?.color ?? "#5fa8ff"
                      const isActive  = marker.id === activeMarkerId
                      const isHovered = marker.id === hoveredMarkerId
                      return (
                        <div
                          key={marker.id}
                          className={`mapas-pin-wrap${isActive ? " active" : ""}`}
                          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                          onMouseEnter={() => setHoveredMarkerId(marker.id)}
                          onMouseLeave={() => setHoveredMarkerId(null)}
                          onClick={() => setActiveMarkerId(isActive ? null : marker.id)}
                        >
                          {/* Pino */}
                          <button
                            type="button"
                            className={`mapas-ping${isActive ? " active" : ""}`}
                            style={{ "--ping-color": color } as React.CSSProperties}
                            aria-label={marker.title}
                          >
                            <span style={{ fontSize: 9 }}>{CAT_ICONS[marker.type] ?? "📍"}</span>
                          </button>

                          {/* Tooltip ao hover */}
                          {(isHovered || isActive) && (
                            <div className="mapas-tooltip">
                              <span className="mapas-tooltip-cat" style={{ color }}>
                                {catLabels[marker.type]?.label ?? marker.type}
                              </span>
                              <strong className="mapas-tooltip-title">{marker.title}</strong>
                              {marker.note && <p className="mapas-tooltip-note">{marker.note}</p>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="mapas-no-image">
                    <MapPin size={32} style={{ opacity: 0.3 }} />
                    <span>Imagem do mapa em breve</span>
                  </div>
                )}

                {/* Legenda de categorias */}
                {visibleMarkers.length > 0 && (
                  <div className="mapas-legend-bar">
                    {Object.entries(catLabels).map(([type, cat]) => {
                      const count = catCounts[type] ?? 0
                      if (!count) return null
                      return (
                        <span key={type} className="mapas-legend-chip" style={{ "--chip-color": cat.color } as React.CSSProperties}>
                          <span className="mapas-legend-dot" />
                          {cat.label} <strong>{count}</strong>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de marcadores por categoria */}
          {visibleMarkers.length > 0 && (
            <div className="mapas-panel-card">
              <p className="mapas-panel-section-label">Marcadores neste mapa</p>
              <div className="mapas-cat-list">
                {Object.entries(catLabels).map(([type, cat]) => {
                  const typeMarkers = visibleMarkers.filter(m => m.type === type)
                  if (!typeMarkers.length) return null
                  return (
                    <div key={type}>
                      <div className="mapas-cat-row">
                        <div className="mapas-cat-dot" style={{ background: cat.color }} />
                        <span className="mapas-cat-label">{cat.label}</span>
                        <span className="mapas-cat-count">{typeMarkers.length}</span>
                      </div>
                      <div className="mapas-marker-list">
                        {typeMarkers.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            className={`mapas-marker-row${m.id === activeMarkerId ? " active" : ""}`}
                            style={{ "--ping-color": cat.color } as React.CSSProperties}
                            onClick={() => setActiveMarkerId(m.id === activeMarkerId ? null : m.id)}
                          >
                            <div className="mapas-marker-row-dot" />
                            <span className="mapas-marker-row-name">{m.title}</span>
                            {m.note && <span className="mapas-marker-row-cat">{m.note.slice(0, 28)}{m.note.length > 28 ? "…" : ""}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Painel lateral direito */}
        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de mapas">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          {selectedMap && (
            <div className="mapas-panel-card">
              <div className="mapas-panel-head">
                <span>{selectedMap.label}</span>
                <strong>{selectedMap.name}</strong>
              </div>
              {selectedMap.description && (
                <p className="mapas-panel-desc">{selectedMap.description}</p>
              )}
            </div>
          )}

          {/* Marcador ativo */}
          {activeMarker && (
            <div className="mapas-panel-card">
              <div className="mapas-marker-detail">
                <p className="mapas-marker-cat" style={{ color: catLabels[activeMarker.type]?.color }}>
                  {CAT_ICONS[activeMarker.type]} {catLabels[activeMarker.type]?.label ?? activeMarker.type}
                </p>
                <span className="mapas-marker-title">{activeMarker.title}</span>
                {activeMarker.note && <p className="mapas-marker-note">{activeMarker.note}</p>}
              </div>
            </div>
          )}

          {/* Categorias */}
          <div className="mapas-panel-card">
            <p className="mapas-panel-section-label">Categorias</p>
            <div className="mapas-cat-list">
              {Object.entries(catLabels).map(([type, cat]) => (
                <div key={type} className="mapas-cat-row">
                  <div className="mapas-cat-dot" style={{ background: cat.color }} />
                  <span className="mapas-cat-label">{CAT_ICONS[type]} {cat.label}</span>
                  <span className="mapas-cat-count">{catCounts[type] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <button type="button" className="store-panel-reopen" aria-label="Abrir painel" onClick={() => setPanel(true)}>
          <ChevronLeft size={16} strokeWidth={2.5} />
          <span>Painel</span>
        </button>
      </div>
    </div>
  )
}

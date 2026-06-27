"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, MapPin } from "lucide-react"
import { mapMarkers as localMarkers, markerCategories } from "@/data/map-markers"
import SidePanelUserHeader from "@/components/side-panel-user-header"
import "../../../styles/mapas.css"
import type { MapRecord, MapMarker } from "@/app/api/mapas/route"

const catLabels = markerCategories as Record<string, { label: string; color: string }>

const PANEL_KEY = "mapas-panel-open"

export default function MapasPage() {
  const [maps, setMaps]                     = useState<MapRecord[]>([])
  const [markers, setMarkers]               = useState<MapMarker[]>([])
  const [loading, setLoading]               = useState(true)
  const [selectedMapId, setSelectedMapId]   = useState("")
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen]           = useState(true)

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

  const selectedMap     = maps.find(m => m.id === selectedMapId)
  const visibleMarkers  = markers.filter(m => m.map_id === selectedMapId)
  const selectedMarker  = selectedMarkerId !== null ? visibleMarkers[selectedMarkerId] : null

  const catCounts = visibleMarkers.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})

  function selectMap(id: string) {
    setSelectedMapId(id)
    setSelectedMarkerId(null)
  }

  if (loading) return <div style={{ padding: 64, textAlign: "center", color: "var(--gray-500)" }}>Carregando mapas...</div>

  return (
    <div className={`mapas-page${panelOpen ? "" : " mapas-page--panel-closed"}`}>
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

          {/* Lista de mapas */}
          <div className="mapas-list">
            {maps.map(m => (
              <button
                key={m.id}
                type="button"
                className={`mapas-map-btn${m.id === selectedMapId ? " active" : ""}${m.status !== "ready" ? " pending" : ""}`}
                onClick={() => m.status === "ready" && selectMap(m.id)}
                disabled={m.status !== "ready"}
              >
                <span className="mapas-map-name">{m.name}</span>
                {m.label && <span className="mapas-map-label">{m.label}</span>}
                {m.status !== "ready" && <span className="mapas-map-badge">Em breve</span>}
              </button>
            ))}
          </div>

          {/* Visualizador */}
          {selectedMap && (
            <div className="mapas-viewer">
              <div className="mapas-viewer-header">
                <div>
                  <h2 className="mapas-viewer-title">{selectedMap.name}</h2>
                  {selectedMap.description && (
                    <p className="mapas-viewer-desc">{selectedMap.description}</p>
                  )}
                </div>
                <div className="mapas-legend">
                  {Object.entries(catCounts).map(([type, count]) => (
                    <span key={type} className="mapas-legend-item" style={{ color: catLabels[type]?.color ?? "#fff" }}>
                      <MapPin size={11} />
                      {catLabels[type]?.label ?? type} ({count})
                    </span>
                  ))}
                </div>
              </div>

              {selectedMap.image_url ? (
                <div className="mapas-canvas-wrap">
                  <img
                    src={selectedMap.image_url}
                    alt={selectedMap.name}
                    className="mapas-canvas-img"
                    draggable={false}
                  />
                  {visibleMarkers.map((marker, i) => (
                    <button
                      key={marker.id}
                      type="button"
                      className={`mapas-pin${selectedMarkerId === i ? " active" : ""}`}
                      style={{
                        left:  `${marker.x}%`,
                        top:   `${marker.y}%`,
                        color: catLabels[marker.type]?.color ?? "#fff",
                      }}
                      onClick={() => setSelectedMarkerId(selectedMarkerId === i ? null : i)}
                      title={marker.title}
                    >
                      <MapPin size={18} fill="currentColor" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mapas-canvas-placeholder">
                  <p>Imagem do mapa em breve.</p>
                </div>
              )}

              {/* Detalhe do marcador */}
              {selectedMarker && (
                <div className="mapas-marker-detail" style={{ borderColor: catLabels[selectedMarker.type]?.color }}>
                  <span className="mapas-marker-type" style={{ color: catLabels[selectedMarker.type]?.color }}>
                    {catLabels[selectedMarker.type]?.label ?? selectedMarker.type}
                  </span>
                  <h3>{selectedMarker.title}</h3>
                  {selectedMarker.note && <p>{selectedMarker.note}</p>}
                </div>
              )}
            </div>
          )}

          {/* Lista de marcadores por categoria */}
          {visibleMarkers.length > 0 && (
            <div className="mapas-markers-grid">
              {Object.entries(catLabels).map(([type, cat]) => {
                const typeMarkers = visibleMarkers.filter(m => m.type === type)
                if (!typeMarkers.length) return null
                return (
                  <div key={type} className="mapas-markers-group">
                    <h3 style={{ color: cat.color }}>{cat.label}</h3>
                    <ul>
                      {typeMarkers.map((m, i) => {
                        const idx = visibleMarkers.indexOf(m)
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              className={`mapas-marker-item${selectedMarkerId === idx ? " active" : ""}`}
                              onClick={() => setSelectedMarkerId(selectedMarkerId === idx ? null : idx)}
                            >
                              <MapPin size={12} style={{ color: cat.color }} />
                              {m.title}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className={`store-side-panel${panelOpen ? "" : " store-side-panel--hidden"}`} aria-label="Painel de mapas">
          <SidePanelUserHeader onClose={() => setPanel(false)} showStats={false} />

          {selectedMap && (
            <div className="store-side-card">
              <h2>{selectedMap.name}</h2>
              {selectedMap.label && <p className="store-side-label">{selectedMap.label}</p>}
              {selectedMap.description && <p style={{ fontSize: 13, color: "var(--paper-dim)", margin: "8px 0 0", lineHeight: 1.6 }}>{selectedMap.description}</p>}
            </div>
          )}

          <div className="store-side-card">
            <h2>Categorias</h2>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {Object.entries(catLabels).map(([type, cat]) => (
                <div key={type} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: cat.color, display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={12} />{cat.label}
                  </span>
                  <span style={{ color: "var(--paper-dim)" }}>{catCounts[type] ?? 0}</span>
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

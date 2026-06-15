"use client"

import { useState } from "react"
import arcData from "@/data/arc-data"
import { mapMarkers, markerCategories, routeCategories } from "@/data/map-markers"
import "../../../styles/mapas.css"

type ArcMap = { id: string; name: string; label?: string; status?: string; description?: string; image?: string }
type Marker = { mapId: string; type: string; x: number; y: number; title: string; note?: string }

const data = arcData as unknown as { items: unknown[]; bots: unknown[]; maps: ArcMap[]; trades: unknown[] }
const markers = mapMarkers as Marker[]
const catLabels = markerCategories as Record<string, { label: string; color: string }>
const routeLabels = routeCategories as Record<string, { label: string; color: string }>

export default function MapasPage() {
  const [selectedMapId, setSelectedMapId] = useState(data.maps[0]?.id ?? "")
  const [showMarkers, setShowMarkers] = useState(true)
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null)

  const selectedMap = data.maps.find(m => m.id === selectedMapId)
  const visibleMarkers = markers.filter(m => m.mapId === selectedMapId)
  const selectedMarker = selectedMarkerId !== null ? visibleMarkers[selectedMarkerId] : null

  return (
    <>
      <div className="section-head">
        <div>
          <p>Map database <strong>{data.maps.length}</strong> regions indexed</p>
          <h2>Mapas</h2>
        </div>
        <span>Preview tático para rotas e marcadores</span>
      </div>

      <section className="map-browser" aria-label="Visualizador de mapas">
        <div className="map-selector">
          {data.maps.map(map => (
            <button
              key={map.id}
              type="button"
              className={`map-item${map.id === selectedMapId ? " active" : ""}${map.status === "ready" ? "" : " pending"}`}
              onClick={() => { setSelectedMapId(map.id); setSelectedMarkerId(null) }}
            >
              <strong>{map.name}</strong>
              <span>{map.status === "ready" ? "Disponível" : "Pendente"}</span>
            </button>
          ))}
        </div>

        <article className="map-viewer">
          <div className="map-viewer-head">
            <div>
              <p>{selectedMap?.label ?? selectedMapId}</p>
              <h3>{selectedMap?.name ?? "Mapa"}</h3>
            </div>
            <span className={`map-status-badge${selectedMap?.status === "ready" ? " ready" : " pending"}`}>
              {selectedMap?.status === "ready" ? "Pronto" : "Pendente"}
            </span>
          </div>

          <div className="map-tools">
            <div>
              <span>Marcadores</span>
              <strong>{showMarkers ? visibleMarkers.length : 0} ativos</strong>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ display: "flex", gap: "6px", alignItems: "center", color: "var(--muted)", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
                <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} />
                Mostrar pings
              </label>
            </div>
          </div>

          <div className="map-viewer-media" style={{ position: "relative", overflow: "hidden" }}>
            {selectedMap?.image ? (
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <img src={`/${selectedMap.image}`} alt={selectedMap.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                {showMarkers && visibleMarkers.map((marker, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedMarkerId(selectedMarkerId === i ? null : i)}
                    style={{
                      position: "absolute",
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      border: `2px solid ${catLabels[marker.type]?.color ?? "#fff"}`,
                      background: `${catLabels[marker.type]?.color ?? "#fff"}88`,
                      boxShadow: `0 0 8px ${catLabels[marker.type]?.color ?? "#fff"}`,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title={marker.title}
                  />
                ))}
              </div>
            ) : (
              <div className="map-placeholder" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: "14px", fontWeight: 800 }}>
                Imagem do mapa indisponível
              </div>
            )}
          </div>

          <div className="map-info-row">
            <p className="map-description">{selectedMap?.description ?? ""}</p>
            {selectedMarker && (
              <aside className="marker-detail" aria-live="polite">
                <div style={{ borderBottom: "1px solid var(--line-soft)", paddingBottom: "10px", marginBottom: "10px" }}>
                  <small style={{ color: catLabels[selectedMarker.type]?.color ?? "var(--cyan)", fontSize: "10px", fontWeight: 950, textTransform: "uppercase" }}>
                    {catLabels[selectedMarker.type]?.label ?? selectedMarker.type}
                  </small>
                  <h4 style={{ margin: "4px 0 0", color: "#fff", fontSize: "14px" }}>{selectedMarker.title}</h4>
                </div>
                {selectedMarker.note && <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px", lineHeight: 1.6 }}>{selectedMarker.note}</p>}
              </aside>
            )}
            <section className="marker-list-panel" aria-label="Lista de marcadores">
              {visibleMarkers.length === 0 ? (
                <p style={{ color: "var(--faint)", fontSize: "12px" }}>Sem marcadores para este mapa.</p>
              ) : visibleMarkers.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  className={`marker-list-item${selectedMarkerId === i ? " active" : ""}`}
                  onClick={() => setSelectedMarkerId(selectedMarkerId === i ? null : i)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: catLabels[m.type]?.color ?? "#fff", flexShrink: 0 }} />
                  <span style={{ color: "#cdd8e5", fontSize: "12px", fontWeight: 800, textAlign: "left" }}>{m.title}</span>
                  <span style={{ color: catLabels[m.type]?.color ?? "var(--muted)", fontSize: "10px", marginLeft: "auto" }}>{catLabels[m.type]?.label ?? m.type}</span>
                </button>
              ))}
            </section>
          </div>
        </article>
      </section>
    </>
  )
}


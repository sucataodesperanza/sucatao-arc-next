"use client"

import { useCallback, useState } from "react"
import Cropper, { type Area, type Point } from "react-easy-crop"

export function AvatarCropModal({
  imageSrc,
  loading,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  loading: boolean
  onCancel: () => void
  onConfirm: (area: Area) => void
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels)
  }, [])

  return (
    <div className="avatar-crop-overlay">
      <div className="avatar-crop-modal">
        <h3>Ajustar foto de perfil</h3>
        <p>Arraste para posicionar e use o controle para dar zoom na área que vai aparecer no círculo.</p>

        <div className="avatar-crop-area">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="avatar-crop-zoom"
          aria-label="Zoom"
          disabled={loading}
        />

        <div className="avatar-crop-actions">
          <button type="button" className="profile-action-btn" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className="profile-action-btn profile-action-btn-primary"
            onClick={() => croppedArea && onConfirm(croppedArea)}
            disabled={loading || !croppedArea}
          >
            {loading ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  )
}

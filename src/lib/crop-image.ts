import type { Area } from "react-easy-crop"

export function getCroppedImageBlob(imageSrc: string, area: Area, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = area.width
      canvas.height = area.height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas não suportado"))
        return
      }

      ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Falha ao gerar imagem recortada"))
      }, mimeType, 0.92)
    }
    image.onerror = () => reject(new Error("Falha ao carregar imagem"))
    image.src = imageSrc
  })
}

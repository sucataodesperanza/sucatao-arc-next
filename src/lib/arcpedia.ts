export const ARC_TYPE_LABELS: Record<string, string> = {
  "Heavy Assault": "Assalto Pesado",
  "Heavy Artillery": "Artilharia Pesada",
  "Area Denial": "Negação de Área",
  "Medium Drone": "Drone Médio",
  "Siege Engine": "Máquina de Cerco",
  "Boss": "Chefe",
  "Explosive": "Explosivo",
  "Flying Artillery": "Artilharia Voadora",
  "Sniper Turret": "Torre Sniper",
  "Scout Drone": "Drone Explorador",
  "Reconnaissance": "Reconhecimento",
  "Defense System": "Sistema de Defesa",
  "Ambush Predator": "Predador de Emboscada",
  "Flying Drone": "Drone Voador",
}

export function getArcTypeLabel(type?: string | null) {
  if (!type) return "ARC unit"
  return ARC_TYPE_LABELS[type] ?? type
}

export const ARC_THREAT_ORDER = ["Low", "Moderate", "High", "Critical", "Extreme"]

export const ARC_THREAT_LABELS: Record<string, string> = {
  Low: "Baixa",
  Moderate: "Moderada",
  High: "Alta",
  Critical: "Crítica",
  Extreme: "Extrema",
}

export const ARC_THREAT_COLORS: Record<string, string> = {
  Low: "#3df28b",
  Moderate: "#ffd400",
  High: "#ff9d1b",
  Critical: "#ff6171",
  Extreme: "#b477ff",
}

export function getArcThreat(threat?: string | null) {
  return ARC_THREAT_ORDER.includes(threat ?? "") ? (threat as string) : "Unknown"
}

export function getArcThreatLabel(threat?: string | null) {
  if (!threat || threat === "Unknown") return "Desconhecida"
  return ARC_THREAT_LABELS[threat] ?? threat
}

export function getArcThreatColor(threat?: string | null) {
  return ARC_THREAT_COLORS[threat ?? ""] ?? "#8b99aa"
}

export type ArcEntry = {
  id: string
  name: string
  description?: string
  type?: string
  threat?: string
  weakness?: string
  destroyXp?: number
  lootXp?: number
  drops: string[]
  image?: string
}

export type ArcRow = {
  id: string
  name: string
  description: string | null
  type: string | null
  threat: string | null
  weakness: string | null
  destroy_xp: number | null
  loot_xp: number | null
  drops: string[] | null
  icon_url: string | null
  image_url: string | null
}

export function mapArcRow(row: ArcRow): ArcEntry {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type ?? undefined,
    threat: row.threat ?? undefined,
    weakness: row.weakness ?? undefined,
    destroyXp: row.destroy_xp ?? undefined,
    lootXp: row.loot_xp ?? undefined,
    drops: row.drops ?? [],
    image: row.image_url ?? row.icon_url ?? undefined,
  }
}

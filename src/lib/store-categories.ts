import type { CatalogItem } from "@/lib/catalog"

export const storeCategories = [
  { key: "loadouts", title: "Loadouts", tone: "yellow", text: "Kits para preparar sua próxima expedição." },
  { key: "armas", title: "Armas", tone: "red", text: "Encontre sua próxima arma para enfrentar a superfície." },
  { key: "consumiveis", title: "Consumíveis", tone: "green", text: "Recupere suas forças e mantenha sua equipe em combate." },
  { key: "granadas", title: "Granadas", tone: "cyan", text: "Controle o campo de batalha com granadas e arremessáveis." },
  { key: "materiais", title: "Materiais", tone: "yellow", text: "Recursos para fabricar, aprimorar e seguir em frente." },
] as const

export function matchesStoreCategory(item: CatalogItem, category: string) {
  const type = (item.type ?? "").trim().toLowerCase()
  const name = item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  if (category !== "itens" && category !== "destaques" && (item.isBlueprint || type === "blueprint")) return false
  const isGrenade = type === "throwable" || type === "grenade" ||
    (type === "quick use" && /granada|grenade|wolfpack|matilha de lobos|trigger nade/.test(name) && !/armadilha|trap/.test(name))
  switch (category) {
    case "loadouts": return type === "loadout"
    case "armas": return item.isWeapon === true || type === "weapon"
    case "consumiveis": return type === "consumable" ||
      (type === "quick use" && /atadura|bandage|injecao|shot|vita|recarregador de escudo|shield recharger|suco de agave|agave juice|mix de frutas|fruit mix|desfibrilador|defibrillator/.test(name))
    case "granadas": return isGrenade
    case "materiais": return ["material", "basic material", "advanced material", "refined material", "topside material"].includes(type)
    default: return true
  }
}

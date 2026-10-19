import data from "@/data/weapon-stencils.json"
import type { CatalogItem } from "@/lib/catalog"
import { getWeaponProfile } from "@/lib/loadout"

export const stencilSource = data.sources.compatibility
export const stencilItems: CatalogItem[] = data.stencils.map(s=>({id:s.id,name:s.name,image:s.image,rarity:s.rarity,type:"Stencil",stackSize:1}))
export function acceptsWeaponStencil(weapon: CatalogItem | undefined, stencil: CatalogItem) {
  if (!weapon || stencil.type?.toLowerCase() !== "stencil") return false
  const profile = getWeaponProfile(weapon)
  if (!profile || profile.name.startsWith("Amplified ")) return false
  return data.stencils.find(s=>s.id === stencil.id)?.families.includes(profile.family) ?? false
}
export const paintedWeaponId = (weaponId: string, stencilId: string) => `painted:${encodeURIComponent(weaponId)}:${encodeURIComponent(stencilId)}`
export function parsePaintedWeaponId(id: string) {
  const parts = id.split(":")
  if (parts.length !== 3 || parts[0] !== "painted" || !parts[1] || !parts[2]) throw new Error("Arma com estampa inválida.")
  return {weaponId:decodeURIComponent(parts[1]),stencilId:decodeURIComponent(parts[2])}
}
export function preparePaintedWeaponPurchase(weapon: CatalogItem | undefined, stencil: CatalogItem | undefined, line: {quantity:number;mode:"points"|"cash";pricePoints?:number;priceCash?:number}) {
  if (!weapon || !stencil || !acceptsWeaponStencil(weapon,stencil)) throw new Error("A estampa não é compatível com a arma escolhida.")
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 2000) throw new Error("Quantidade inválida.")
  const key = line.mode === "points" ? "pricePoints" : "priceCash"
  const a=weapon[key], b=stencil[key]
  if (typeof a !== "number" || typeof b !== "number" || a <= 0 || b <= 0 || !Number.isFinite(a+b)) throw new Error("Arma ou estampa indisponível nesta forma de pagamento.")
  if (line[key] !== Math.round((a+b)*100)/100) throw new Error("O preço da arma ou da estampa mudou. Adicione a configuração novamente ao carrinho.")
  return [{item:weapon,quantity:line.quantity,name:`${weapon.name} · Estampa: ${stencil.name}`,stencilId:stencil.id,stencilName:stencil.name},{item:stencil,quantity:line.quantity,name:stencil.name}]
}

export function expandPaintedCart(items: {itemId:string;quantity:number}[]) {
  return items.flatMap(line=>{
    if(!line.itemId.startsWith("painted:"))return [line]
    try {const {weaponId,stencilId}=parsePaintedWeaponId(line.itemId);return [{itemId:weaponId,quantity:line.quantity},{itemId:stencilId,quantity:line.quantity}]}catch{return []}
  })
}

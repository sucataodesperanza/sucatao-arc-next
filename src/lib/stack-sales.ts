import data from "@/data/item-stack-sizes.json"
import type { CatalogItem } from "@/lib/catalog"

const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")
const byId=new Map(data.items.map(i=>[normalize(i.id),i.stackSize]))
const byName=new Map(data.items.map(i=>[normalize(i.name),i.stackSize]))
export function saleStackSize(item:CatalogItem):number|null {
  const confirmed=byId.get(normalize(item.id)) ?? (item.nameEn ? byName.get(normalize(item.nameEn)) : undefined)
  if(confirmed)return confirmed
  if(Number.isSafeInteger(item.stackSize) && item.stackSize!>0)return item.stackSize!
  // Furniture has placement metadata rather than stackSize in MetaForge; keep unit sales.
  return item.type?.trim().toLowerCase()==="furniture" ? 1 : null
}
export function stackSaleOffer(item:CatalogItem):CatalogItem|null {
  const size=saleStackSize(item)
  if(!size)return null
  const points=item.pricePoints??Math.round((item.value??0)*24),cash=item.priceCash??item.value??0
  return {...item,id:`stack:${encodeURIComponent(item.id)}:${size}`,name:size>1?`${item.name} · stack com ${size} unidades`:item.name,quantity:Math.floor((item.quantity??0)/size),value:(item.value??0)*size,pricePoints:Number.isFinite(points)&&points>0?Math.round(points*size*100)/100:undefined,priceCash:Number.isFinite(cash)&&cash>0?Math.round(cash*size*100)/100:undefined,weightKg:item.weightKg===undefined?undefined:item.weightKg*size}
}
export function parseStackSaleId(id:string) {
  const parts=id.split(":")
  if(parts.length!==3 || parts[0]!=="stack" || !parts[1] || !/^[1-9]\d*$/.test(parts[2]))throw new Error("Stack inválido.")
  const size=Number(parts[2])
  if(!Number.isSafeInteger(size))throw new Error("Stack inválido.")
  return {itemId:decodeURIComponent(parts[1]),size}
}
export function prepareStackPurchase(item:CatalogItem|undefined,line:{itemId:string;quantity:number;mode:"points"|"cash";pricePoints?:number;priceCash?:number}) {
  const requested=parseStackSaleId(line.itemId)
  if(!item || item.id!==requested.itemId || item.isWeapon || item.type?.toLowerCase()==="weapon")throw new Error("Item indisponível nesta aba.")
  const size=saleStackSize(item),offer=stackSaleOffer(item)
  if(!size || !offer || size!==requested.size)throw new Error("O tamanho do stack mudou. Adicione o item novamente ao carrinho.")
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>2000||!Number.isSafeInteger(line.quantity*size))throw new Error("Quantidade de stacks inválida.")
  const key=line.mode==="points"?"pricePoints":"priceCash"
  if(!offer[key] || offer[key]!==line[key])throw new Error("O preço do stack mudou ou está indisponível. Adicione novamente ao carrinho.")
  return {quantity:line.quantity*size,pricePoints:item.pricePoints??Math.round((item.value??0)*24),priceCash:item.priceCash??item.value??0}
}

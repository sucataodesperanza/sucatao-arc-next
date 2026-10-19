import type { CatalogItem } from "@/lib/catalog"
import { createAdminClient } from "@/lib/supabase/admin"

export async function readPaintedWeaponItems(ids:string[]): Promise<CatalogItem[]> {
  const db=createAdminClient()
  const [catalog,stock]=await Promise.all([
    db.from("catalog_items").select("id,name,name_en,item_type,is_weapon,rarity,icon_url,weight_kg,stack_size").eq("active",true).in("id",ids),
    db.from("stock_items").select("catalog_item_id,value,quantity,price_points,price_cash").in("catalog_item_id",ids),
  ])
  if(catalog.error||stock.error)throw new Error("Não foi possível conferir a arma e a estampa.")
  return (catalog.data??[]).map(item=>{
    const row=(stock.data??[]).find(s=>s.catalog_item_id===item.id)
    return {id:item.id,name:item.name,nameEn:item.name_en,type:item.item_type,isWeapon:item.is_weapon,rarity:item.rarity,image:item.icon_url,weightKg:item.weight_kg,stackSize:item.stack_size,value:row?.value??0,quantity:row?.quantity??0,pricePoints:row?.price_points??undefined,priceCash:row?.price_cash??undefined}
  })
}

import { NextResponse } from "next/server"
import { readReadyKits, readReadyKitItems } from "@/lib/ready-kit-store"
import { validateReadyKit } from "@/lib/ready-kits"
export async function GET(){
  try {
    const [all,items]=await Promise.all([readReadyKits(),readReadyKitItems()])
    const ids=new Set(items.map(i=>i.id))
    const kits=all.filter(k=>{try {validateReadyKit(k,ids); return k.active}catch{return false}})
    const used=new Set(kits.flatMap(k=>k.entries.map(e=>e.itemId)))
    return NextResponse.json({kits,items:items.filter(i=>used.has(i.id))},{headers:{"Cache-Control":"no-store"}})
  }catch{return NextResponse.json({error:"Não foi possível carregar os kits."},{status:503})}
}

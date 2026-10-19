import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { readReadyKits, readReadyKitItems } from "@/lib/ready-kit-store"
import { validateReadyKit } from "@/lib/ready-kits"
export async function GET() {
  const guard=await requireAdmin(); if(guard.error)return guard.error
  try { const [kits,items]=await Promise.all([readReadyKits(),readReadyKitItems()]); return NextResponse.json({kits,items},{headers:{"Cache-Control":"no-store"}}) } catch { return NextResponse.json({error:"Não foi possível carregar."},{status:500}) }
}
export async function POST(request:Request) {
  const guard=await requireAdmin(); if(guard.error)return guard.error
  try {
    const body=await request.json()
    if(body.id!==undefined && (typeof body.id!=="string" || !/^[a-f0-9-]{36}$/i.test(body.id))) throw new Error("Identificador inválido.")
    const payload=validateReadyKit(body,new Set((await readReadyKitItems()).map(i=>i.id)))
    const db=createAdminClient()
    let storedPayload: object = payload
    if (body.id) {
      const previous = await db.from("app_entities").select("entity_type,payload").eq("id",body.id).in("entity_type",["ready_kit","weapon_kit"]).single()
      if (previous.error) throw new Error("Kit não encontrado.")
      const original = previous.data.entity_type === "weapon_kit" ? previous.data.payload : previous.data.payload.legacyWeaponKit
      if (original) storedPayload = {...payload,legacyWeaponKit:original}
    }
    const result=body.id ? await db.from("app_entities").update({entity_type:"ready_kit",payload:storedPayload,updated_at:new Date().toISOString()}).in("entity_type",["ready_kit","weapon_kit"]).eq("id",body.id).select("id").single() : await db.from("app_entities").insert({entity_type:"ready_kit",payload}).select("id").single()
    if(result.error)throw new Error("Não foi possível salvar.")
    return NextResponse.json({id:result.data.id})
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Dados inválidos."},{status:400})}
}

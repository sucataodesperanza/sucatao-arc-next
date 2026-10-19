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
    const result=body.id ? await db.from("app_entities").update({payload,updated_at:new Date().toISOString()}).eq("entity_type","ready_kit").eq("id",body.id).select("id").single() : await db.from("app_entities").insert({entity_type:"ready_kit",payload}).select("id").single()
    if(result.error)throw new Error("Não foi possível salvar.")
    return NextResponse.json({id:result.data.id})
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Dados inválidos."},{status:400})}
}

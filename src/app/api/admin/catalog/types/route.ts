import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  const db = createAdminClient()
  const types = new Set<string>()
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("catalog_items").select("item_type").order("id").range(offset, offset + 999)
    if (error) return NextResponse.json({error:"Não foi possível carregar os tipos do catálogo."},{status:500})
    for (const row of data ?? []) if (row.item_type?.trim()) types.add(row.item_type === "Research Item" ? "Research" : row.item_type)
    if ((data?.length ?? 0) < 1000) break
  }
  return NextResponse.json({types:[...types].sort()},{headers:{"Cache-Control":"no-store"}})
}

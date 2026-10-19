import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
async function retired() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error
  return NextResponse.json({ error: "O cadastro foi unificado em Kits. Atualize a página.", href: "/admin/kits" }, { status: 410 })
}
export const GET = retired
export const POST = retired

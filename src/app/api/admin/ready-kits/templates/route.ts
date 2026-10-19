import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { readReadyKits, readReadyKitItems } from "@/lib/ready-kit-store"
import { readyKitContents } from "@/lib/ready-kits"

export async function POST() {
  const guard = await requireAdmin(); if (guard.error) return guard.error
  try {
    const [kits, items] = await Promise.all([readReadyKits(), readReadyKitItems()])
    const existing = new Set(kits.map(readyKitContents))
    const templates = items.filter(i => (i.isWeapon || i.type?.toLowerCase() === "weapon") || (i.id === "herbal_bandage" || /^(atadura de ervas|herbal bandage)$/i.test(i.name.trim()))).map(i => ({ name: `Kit 20 ${i.name}`, description: `Pacote com 20 unidades de ${i.name}.`, image: "", active: false, featured: false, position: 0, pricePoints: 0, priceCash: 0, entries: [{ itemId: i.id, quantity: 20 }] })).filter(k => !existing.has(readyKitContents(k)))
    for (let start = 0; start < templates.length; start += 50) {
      const { error } = await createAdminClient().from("app_entities").insert(templates.slice(start, start + 50).map(payload => ({ entity_type: "ready_kit", payload })))
      if (error) throw new Error("Não foi possível criar todos os modelos. Tente novamente para completar os que faltam.")
    }
    return NextResponse.json({ created: templates.length })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar os modelos." }, { status: 500 }) }
}

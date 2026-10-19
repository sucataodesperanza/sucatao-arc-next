import { NextResponse } from "next/server"
import { readWeaponKits, readWeaponKitCatalog } from "@/lib/weapon-kit-store"
import { validateWeaponKit } from "@/lib/weapon-kits"

export async function GET() {
  try {
    const all = await readWeaponKits()
    const catalog = await readWeaponKitCatalog()
    const kits = all.filter(kit => kit.active && kit.featured && validateWeaponKit(kit, catalog).value)
    const ids = new Set(kits.flatMap(kit => Object.values(kit.draft).map(entry => entry.itemId)))
    const items = catalog.filter(item => ids.has(item.id))
    return NextResponse.json({ configured: all.length > 0, kits, items }, { headers: { "Cache-Control": "no-store" } })
  }
  catch { return NextResponse.json({ error: "Não foi possível carregar os kits em destaque." }, { status: 503 }) }
}

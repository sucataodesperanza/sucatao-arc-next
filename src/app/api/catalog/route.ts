import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { mapStockItem, type StockJoinRow } from "@/lib/catalog"

export async function GET() {
  const supabase = await createClient()

  // Nota: não filtramos catalog_items.active aqui porque a RLS já aplica
  // esse filtro automaticamente (policy "catalog_items_select_active_public").
  // Filtrar novamente via .eq() em recursos embedded pode retornar 0 resultados
  // em algumas versões do PostgREST mesmo quando a RLS passa.
  const { data, error } = await supabase
    .from("stock_items")
    .select("value, quantity, featured, catalog_items!inner(id, name, description, item_type, rarity, weight_kg, stack_size, icon_url, is_weapon, is_blueprint, is_craftable, is_recyclable)")
    .returns<StockJoinRow[]>()

  if (error) {
    console.error("api/catalog error:", error)
    return NextResponse.json({ error: "Erro ao carregar catálogo." }, { status: 500 })
  }

  return NextResponse.json({ items: (data ?? []).map(mapStockItem) })
}

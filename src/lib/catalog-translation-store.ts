import { createAdminClient } from "@/lib/supabase/admin"
import type { CatalogTranslation } from "@/lib/catalog-translations"

export async function readCatalogTranslations(): Promise<CatalogTranslation[]> {
  const all: CatalogTranslation[] = []
  for (let offset=0;;offset+=1000) {
    const {data,error}=await createAdminClient().from("app_entities").select("payload").eq("entity_type","catalog_translation").order("id").range(offset,offset+999)
    if(error) throw new Error("Não foi possível carregar as traduções manuais.")
    for(const row of data??[]) if(typeof row.payload?.itemId==="string" && typeof row.payload?.name==="string") all.push(row.payload as CatalogTranslation)
    if((data?.length??0)<1000)return all
  }
}

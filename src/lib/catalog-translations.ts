import { createHash } from "node:crypto"

export type CatalogTranslation = { itemId: string; name: string }

export function translationRecordId(itemId: string) {
  const hash = createHash("sha256").update(`catalog_translation:${itemId}`).digest("hex").slice(0,32)
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}`
}

export function validateTranslatedName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200 || /[\u0000-\u001f]/.test(value)) throw new Error("Informe um nome com 1 a 200 caracteres.")
  return value.trim()
}

export function applyCatalogTranslations<T extends { id: string; name: string }>(rows: T[], translations: CatalogTranslation[]) {
  const names = new Map(translations.map(t=>[t.itemId,t.name]))
  return rows.map(row=>names.has(row.id)?{...row,name:names.get(row.id)!}:row)
}

export type PriceField = "price_points" | "price_cash"
export const priceFields: PriceField[] = ["price_points", "price_cash"]

export function parsePriceInput(raw: string, field: PriceField): number | null {
  let value = raw.trim()
  if (field === "price_points") {
    if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, "")
    if (!/^\d+$/.test(value)) return null
  } else {
    if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(value)) value = value.replace(/\./g, "")
    if (!/^\d+([.,]\d{1,2})?$/.test(value)) return null
    value = value.replace(",", ".")
  }
  const number = Number(value)
  return Number.isFinite(number) && number > 0 && number <= 1000000000 ? number : null
}

export function validatePriceBatch(input: unknown) {
  if (!input || typeof input !== "object" || !Array.isArray((input as { items?: unknown }).items)) return null
  const items = (input as { items: unknown[] }).items
  if (!items.length || items.length > 100) return null
  const seen = new Set<string>()
  const result: { id: string; changes: Partial<Record<PriceField, number>>; expected: Partial<Record<PriceField, number | null>> }[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return null
    const row = raw as Record<string, unknown>
    if (typeof row.id !== "string" || !row.id || row.id.length > 200 || seen.has(row.id) || !row.changes || typeof row.changes !== "object" || !row.expected || typeof row.expected !== "object") return null
    seen.add(row.id)
    const changes: Partial<Record<PriceField, number>> = {}, expected: Partial<Record<PriceField, number | null>> = {}
    for (const [key, value] of Object.entries(row.changes)) {
      if (!priceFields.includes(key as PriceField) || typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1000000000 || (key === "price_points" ? !Number.isInteger(value) : Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)) return null
      const previous = (row.expected as Record<string, unknown>)[key]
      if (previous !== null && (typeof previous !== "number" || !Number.isFinite(previous))) return null
      changes[key as PriceField] = value
      expected[key as PriceField] = previous as number | null
    }
    if (!Object.keys(changes).length) return null
    result.push({ id: row.id, changes, expected })
  }
  return result
}

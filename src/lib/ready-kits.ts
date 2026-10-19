export type ReadyKit = { id: string; name: string; description: string; image: string; active: boolean; featured: boolean; position: number; pricePoints: number; priceCash: number; entries: { itemId: string; quantity: number }[] }

export function validateReadyKit(input: unknown, ids: Set<string>): Omit<ReadyKit, "id"> {
  const b = input as ReadyKit
  if (!b || typeof b.name !== "string" || !b.name.trim() || b.name.length > 100 || !Array.isArray(b.entries) || !b.entries.length || b.entries.length > 30) throw new Error("Informe um nome e de 1 a 30 itens.")
  const entries = b.entries.map(e => {
    if (!ids.has(e.itemId) || !Number.isSafeInteger(e.quantity) || e.quantity < 1 || e.quantity > 2000) throw new Error("Confira os itens e as quantidades (1 a 2.000).")
    return { itemId: e.itemId, quantity: e.quantity }
  })
  if (new Set(entries.map(e => e.itemId)).size !== entries.length) throw new Error("Agrupe itens repetidos em uma única linha.")
  if (![b.pricePoints, b.priceCash].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100000000) || (b.active && !b.pricePoints && !b.priceCash) || !Number.isSafeInteger(b.pricePoints)) throw new Error("Informe o preço do pacote antes de ativar. Zero desabilita a forma de pagamento.")
  const image = typeof b.image === "string" ? b.image.trim() : ""
  if (image && !/^https:\/\//.test(image) && !/^\/(?!\/)/.test(image)) throw new Error("Use uma imagem HTTPS ou um caminho do site.")
  return { name: b.name.trim(), description: String(b.description ?? "").slice(0, 500), image, active: b.active === true, featured: b.featured === true, position: Number.isFinite(b.position) ? Math.trunc(b.position) : 0, pricePoints: b.pricePoints, priceCash: Math.round(b.priceCash * 100) / 100, entries }
}

// Allocate whole points/cents without changing the exact package total.
export function allocateKitPrice(entries: ReadyKit["entries"], total: number) {
  const units = entries.reduce((sum, e) => sum + e.quantity, 0)
  const base = Math.floor(total / units)
  let remainder = total % units
  return entries.flatMap(e => {
    const extra = Math.min(e.quantity, remainder); remainder -= extra
    return [...(extra ? [{ ...e, quantity: extra, unitPrice: base + 1 }] : []), ...(extra < e.quantity ? [{ ...e, quantity: e.quantity - extra, unitPrice: base }] : [])]
  })
}

export function readyKitContents(kit: Pick<ReadyKit, "entries">) {
  return JSON.stringify([...kit.entries].sort((a,b)=>a.itemId.localeCompare(b.itemId)))
}

export function prepareReadyKitPurchase(kit: ReadyKit | undefined, line: { mode: "points" | "cash"; quantity: number; pricePoints?: number; priceCash?: number; kitContents?: string }) {
  if (!kit?.active) throw new Error("Um kit foi desativado. Remova-o do carrinho e escolha novamente.")
  if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 2000) throw new Error("Quantidade de kits inválida.")
  const price = line.mode === "points" ? kit.pricePoints : kit.priceCash
  const quotedPrice = line.mode === "points" ? line.pricePoints : line.priceCash
  if (!price || quotedPrice !== price || line.kitContents !== readyKitContents(kit)) throw new Error("Um kit foi atualizado. Remova-o do carrinho e adicione novamente.")
  return allocateKitPrice(kit.entries, Math.round(price * (line.mode === "cash" ? 100 : 1))).map(entry=>({ ...entry, quantity:entry.quantity*line.quantity, unitPrice:entry.unitPrice/(line.mode === "cash" ? 100 : 1) }))
}

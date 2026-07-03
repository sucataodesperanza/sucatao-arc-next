export const ITEMS_PER_SLOT: Record<string, number> = {
  Legendary: 3,
  Epic:      5,
  Rare:      10,
  Uncommon:  15,
  Common:    50,
}

export function calcSlotsNeeded(items: { rarity: string; quantity: number }[]): number {
  return items.reduce((total, item) => {
    const perSlot = ITEMS_PER_SLOT[item.rarity] ?? 1
    return total + Math.ceil(item.quantity / perSlot)
  }, 0)
}

export function filterAvailableTrades<T extends { id: string }>(trades: T[], acceptances: { trade_id: string; status: string }[]): T[] {
  const taken = new Set(acceptances.filter(row => row.status !== "cancelled").map(row => row.trade_id))
  return trades.filter(trade => !taken.has(trade.id))
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import arcData from "@/data/arc-data"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/lib/cart-context"
import { getItemTypeLabel, type CatalogItem } from "@/lib/catalog"

export type Bot = {
  id: string; name: string; type?: string; threat?: string; weakness?: string
  description?: string; drops?: string[]; image?: string
}
type ArcDataItem = { id: string; name: string }

const arcMeta = arcData as unknown as { items: ArcDataItem[]; bots: Bot[] }

export function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

export const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unknown"]
export const rarityMetaLabels: Record<string, string> = {
  Common: "Comum", Uncommon: "Incomum", Rare: "Raro", Epic: "Epico", Legendary: "Lendario", Unknown: "Desconhecido"
}
export const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

export function getRarity(item: CatalogItem) {
  return rarityOrder.includes(item.rarity ?? "") ? (item.rarity as string) : "Unknown"
}
export function getType(item: CatalogItem) { return item.type ?? "Item" }
export function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function normalizeText(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() }

export function useItemsCatalog() {
  const router = useRouter()
  const cart = useCart()
  const [query, setQuery] = useState("")
  const [rarity, setRarity] = useState("all")
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("value-desc")
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [botFilter, setBotFilter] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavorites, setShowFavorites] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [points, setPoints] = useState(0)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from("profiles").select("points").eq("id", user.id).single().then(({ data }) => {
        if (data) setPoints(data.points ?? 0)
      })
    })
  }, [])

  useEffect(() => {
    fetch("/api/catalog")
      .then(res => res.json())
      .then(body => setCatalogItems(body.items ?? []))
      .finally(() => setLoadingCatalog(false))
  }, [])

  function toggleFavorite(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAddToCart(item: CatalogItem, mode: "points" | "cash", e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!userId) { router.push("/login"); return }
    cart.addItem({
      itemId: item.id,
      name: item.name,
      type: getType(item),
      rarity: getRarity(item),
      value: item.value ?? 0,
      pricePoints: item.pricePoints,
      priceCash: item.priceCash,
      weightKg: item.weightKg,
      image: item.image,
      mode,
    })
    cart.openDrawer()
  }

  const rarities = useMemo(() => rarityOrder.filter(r => catalogItems.some(i => getRarity(i) === r)), [catalogItems])
  const types = useMemo(() => {
    const counts = new Map<string, number>()
    catalogItems.forEach(i => counts.set(getType(i), (counts.get(getType(i)) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [catalogItems])

  const visibleBots = arcMeta.bots.slice(0, 6)

  const botDropNames = useMemo(() => {
    if (!botFilter) return null
    const bot = arcMeta.bots.find(b => b.id === botFilter)
    if (!bot?.drops?.length) return new Set<string>()
    const names = bot.drops
      .map(dropId => arcMeta.items.find(i => i.id === dropId)?.name)
      .filter((n): n is string => !!n)
      .map(normalizeText)
    return new Set(names)
  }, [botFilter])

  const filteredItems = useMemo(() => {
    const q = normalizeText(query)
    let items = catalogItems.filter(item => {
      if (rarity !== "all" && getRarity(item) !== rarity) return false
      if (type !== "all" && getType(item) !== type) return false
      if (showFavorites && !favorites.has(item.id)) return false
      if (botDropNames && !botDropNames.has(normalizeText(item.name))) return false
      if (!q) return true
      return normalizeText(`${item.name} ${item.type ?? ""} ${item.description ?? ""}`).includes(q)
    })
    if (sort === "value-desc") items.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    else if (sort === "value-asc") items.sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    else if (sort === "value-per-kg-desc") items.sort((a, b) => ((b.value ?? 0) / (b.weightKg ?? 1)) - ((a.value ?? 0) / (a.weightKg ?? 1)))
    else if (sort === "name-asc") items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    else if (sort === "type-asc") items.sort((a, b) => getItemTypeLabel(getType(a)).localeCompare(getItemTypeLabel(getType(b)), "pt-BR"))
    return items
  }, [catalogItems, query, rarity, type, sort, botDropNames, showFavorites, favorites])

  return {
    query, setQuery,
    rarity, setRarity,
    type, setType,
    sort, setSort,
    selectedItem, setSelectedItem,
    botFilter, setBotFilter,
    favorites, toggleFavorite,
    showFavorites, setShowFavorites,
    userId, points,
    catalogItems, loadingCatalog,
    rarities, types, visibleBots,
    filteredItems,
    handleAddToCart,
  }
}

export type ItemsCatalog = ReturnType<typeof useItemsCatalog>

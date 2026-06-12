"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

export type CartMode = "points" | "cash"

export type CartItem = {
  itemId: string
  name: string
  type?: string
  rarity?: string
  value: number
  weightKg?: number
  image?: string
  mode: CartMode
  quantity: number
}

type CartContextValue = {
  items: CartItem[]
  totalCount: number
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (itemId: string, mode: CartMode) => void
  updateQuantity: (itemId: string, mode: CartMode, quantity: number) => void
  clear: () => void
  isOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = "sucatao_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // localStorage indisponível ou dados inválidos: começa com carrinho vazio
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.itemId === item.itemId && i.mode === item.mode)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      }
      return [...prev, { ...item, quantity }]
    })
  }, [])

  const removeItem = useCallback((itemId: string, mode: CartMode) => {
    setItems(prev => prev.filter(i => !(i.itemId === itemId && i.mode === mode)))
  }, [])

  const updateQuantity = useCallback((itemId: string, mode: CartMode, quantity: number) => {
    setItems(prev => {
      if (quantity <= 0) return prev.filter(i => !(i.itemId === itemId && i.mode === mode))
      return prev.map(i => (i.itemId === itemId && i.mode === mode ? { ...i, quantity } : i))
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])
  const toggleDrawer = useCallback(() => setIsOpen(v => !v), [])

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, totalCount, addItem, removeItem, updateQuantity, clear, isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

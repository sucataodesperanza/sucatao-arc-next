"use client"

import { Suspense } from "react"
import { CartProvider } from "@/lib/cart-context"
import { CartDrawer } from "./cart-drawer"
import { RouteLoadingBar } from "./route-loading-bar"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <RouteLoadingBar />
      </Suspense>
      {children}
      <CartDrawer />
    </CartProvider>
  )
}

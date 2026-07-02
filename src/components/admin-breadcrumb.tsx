"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Shield } from "lucide-react"

const PAGE_NAMES: Record<string, string> = {
  home:         "Home",
  economia:     "Economia",
  precos:       "Preços",
  streamers:    "Streamers",
  pedidos:      "Pedidos",
  catalogo:     "Catálogo",
  estoque:      "Estoque",
  trades:       "Trades",
  recompensas:  "Recompensas",
  cupons:       "Cupons",
  "loot-boxes": "Loot Boxes",
  contratos:    "Contratos",
  mapas:        "Mapas",
  faccoes:      "Facções",
  arcpedia:     "Arcpedia",
  crafting:     "Crafting",
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1]
  const pageName = last === "admin" ? null : (PAGE_NAMES[last] ?? last)

  return (
    <div className="admin-breadcrumb">
      <Shield size={11} />
      <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
      {pageName && (
        <>
          <ChevronRight size={12} className="admin-breadcrumb-sep" />
          <span className="admin-breadcrumb-page">{pageName}</span>
        </>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Shield } from "lucide-react"
import { useAdminSubpage } from "@/components/admin-subpage-context"

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
  const pathname  = usePathname()
  const { title, onBack } = useAdminSubpage()
  const segments  = pathname.split("/").filter(Boolean)
  const last      = segments[segments.length - 1]
  const pageName  = last === "admin" ? null : (PAGE_NAMES[last] ?? last)

  return (
    <div className="admin-breadcrumb">
      <Shield size={11} />
      <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
      {pageName && (
        <>
          <ChevronRight size={12} className="admin-breadcrumb-sep" />
          {title && onBack ? (
            <button
              type="button"
              className="admin-breadcrumb-link"
              onClick={onBack}
              style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}
            >
              {pageName}
            </button>
          ) : (
            <span className="admin-breadcrumb-page">{pageName}</span>
          )}
        </>
      )}
      {title && (
        <>
          <ChevronRight size={12} className="admin-breadcrumb-sep" />
          <span className="admin-breadcrumb-page">{title}</span>
        </>
      )}
    </div>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Gift, Package, Ticket, Warehouse } from "lucide-react"

const links = [
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/catalogo", label: "Catálogo", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Warehouse },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/loot-boxes", label: "Loot Boxes", icon: Gift },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-rail">
      <div className="admin-rail-head">
        <span className="admin-rail-badge">S</span>
        <div>
          <h3>Painel Admin</h3>
          <p>Arc Raiders</p>
        </div>
      </div>
      <nav className="admin-rail-nav">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link key={href} href={href} className={`admin-nav-link${active ? " active" : ""}`}>
              <span className="admin-nav-icon"><Icon size={14} /></span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Home" },
  { href: "/itens", label: "Itens" },
  { href: "/trades", label: "Trades" },
  { href: "/arcs", label: "ARCs" },
  { href: "/crafting", label: "Crafting" },
  { href: "/reciclagem", label: "Reciclagem" },
  { href: "/mapas", label: "Mapas" },
  { href: "/perfil", label: "Perfil" },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="main-nav" aria-label="Navegação principal">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={pathname === l.href ? "active" : ""}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}

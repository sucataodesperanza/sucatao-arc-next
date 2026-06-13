"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bot, Hammer, Home, LogIn, Map, Package, Recycle, Repeat2, Settings, Shield, ShoppingCart, User } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { BrandMark } from "./brand-mark"
import { LogoutButton } from "./logout-button"

const navLinks = [
  { href: "/", label: "Início", icon: Home },
  { href: "/itens", label: "Itens", icon: Package },
  { href: "/trades", label: "Trades", icon: Repeat2 },
  { href: "/arcs", label: "ARCs", icon: Bot },
  { href: "/crafting", label: "Crafting", icon: Hammer },
  { href: "/reciclagem", label: "Reciclagem", icon: Recycle },
  { href: "/mapas", label: "Mapas", icon: Map },
]

export function SidebarNav({ isLoggedIn, isAdmin, avatarUrl }: { isLoggedIn: boolean; isAdmin: boolean; avatarUrl: string | null }) {
  const pathname = usePathname()
  const cart = useCart()

  return (
    <aside className="site-rail">
      <Link href="/" className="site-rail-brand" aria-label="Início">
        <BrandMark />
      </Link>

      <nav className="site-rail-nav" aria-label="Navegação principal">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${active ? " active" : ""}`}
              data-tooltip={label}
            >
              <Icon size={22} />
            </Link>
          )
        })}

        <button type="button" className="sidebar-link" data-tooltip="Carrinho" onClick={cart.toggleDrawer}>
          <ShoppingCart size={22} />
          {cart.totalCount > 0 && <span className="sidebar-cart-badge">{cart.totalCount}</span>}
        </button>

        {isAdmin && (
          <Link href="/admin" className={`sidebar-link${pathname?.startsWith("/admin") ? " active" : ""}`} data-tooltip="Admin">
            <Shield size={22} />
          </Link>
        )}

        {isLoggedIn ? (
          <LogoutButton variant="icon" />
        ) : (
          <Link href="/login" className="sidebar-link" data-tooltip="Entrar">
            <LogIn size={22} />
          </Link>
        )}
      </nav>

      <div className="site-rail-footer">
        <Link href="/perfil" className={`sidebar-link${pathname?.startsWith("/perfil") ? " active" : ""}`} data-tooltip="Perfil">
          {avatarUrl ? (
            <span className="sidebar-avatar">
              <img src={avatarUrl} alt="Perfil" />
              {isLoggedIn && <span className="sidebar-status-dot" />}
            </span>
          ) : (
            <User size={22} />
          )}
        </Link>

        <Link href="/perfil" className="sidebar-link" data-tooltip="Configurações">
          <Settings size={22} />
        </Link>
      </div>
    </aside>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, Bot, Flag, Hammer, Home, LogIn, Map, MoreHorizontal, Package, Radio, Recycle, Repeat2, ScrollText, Settings, Shield, ShoppingCart, Store, User } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { BrandMark } from "./brand-mark"
import { LogoutButton } from "./logout-button"

const navLinks = [
  { href: "/",           label: "Início",     icon: Home       },
  { href: "/loja",       label: "Loja",       icon: Store      },
  { href: "/inventario", label: "Inventário", icon: Package    },
  { href: "/trades",     label: "Trades",     icon: Repeat2    },
  { href: "/faccoes",    label: "Facções",    icon: Flag       },
  { href: "/contratos",  label: "Contratos",  icon: ScrollText },
  { href: "/crafting",   label: "Crafting",   icon: Hammer     },
  { href: "/reciclagem", label: "Reciclagem", icon: Recycle    },
  { href: "/mapas",      label: "Mapas",      icon: Map        },
  { href: "/arcpedia",   label: "Arcpedia",   icon: Bot        },
  { href: "/rankings",   label: "Rankings",   icon: BarChart2  },
  { href: "/streamers",  label: "Streamers",  icon: Radio      },
]

const VISIBLE_COUNT = 6
const visibleLinks = navLinks.slice(0, VISIBLE_COUNT)
const extraLinks   = navLinks.slice(VISIBLE_COUNT)

const SIDEBAR_WIDTH = 92

export function SidebarNav({ isLoggedIn, isAdmin, avatarUrl }: { isLoggedIn: boolean; isAdmin: boolean; avatarUrl: string | null }) {
  const pathname = usePathname()
  const cart = useCart()

  const [moreOpen, setMoreOpen] = useState(false)
  const [popoverTop, setPopoverTop] = useState(0)
  const moreRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  function toggleMore() {
    if (!moreOpen && moreRef.current) {
      const rect = moreRef.current.getBoundingClientRect()
      setPopoverTop(rect.top)
    }
    setMoreOpen(prev => !prev)
  }

  // Fecha ao clicar fora
  useEffect(() => {
    if (!moreOpen) return
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (!moreRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [moreOpen])

  // Fecha ao navegar
  useEffect(() => { setMoreOpen(false) }, [pathname])

  const hasActiveExtra = extraLinks.some(({ href }) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href)
  )

  return (
    <aside className="site-rail">
      <Link href="/" className="site-rail-brand" aria-label="Início">
        <BrandMark />
      </Link>

      <nav className="site-rail-nav" aria-label="Navegação principal">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
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

        {/* Botão "mais" */}
        {extraLinks.length > 0 && (
          <>
            <button
              ref={moreRef}
              type="button"
              className={`sidebar-link${moreOpen || hasActiveExtra ? " active" : ""}`}
              data-tooltip="Mais"
              onClick={toggleMore}
              aria-label="Mais opções"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={22} />
            </button>

            {/* Popover flutuante */}
            {moreOpen && (
              <div
                ref={popoverRef}
                className="sidebar-more-popover"
                style={{ top: popoverTop, left: SIDEBAR_WIDTH + 6 }}
              >
                {extraLinks.map(({ href, label, icon: Icon }) => {
                  const active = href === "/" ? pathname === "/" : pathname?.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`sidebar-more-item${active ? " active" : ""}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

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

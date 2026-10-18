"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft, ArrowLeftRight, Bot, ClipboardList, DollarSign, Flag, Gift,
  Hammer, Home, Map, Package, Radio, ScrollText, Shield, Star, Ticket,
  TrendingUp, Warehouse, Compass, Users, UserPlus,
} from "lucide-react"
import { BrandMark } from "./brand-mark"

const links = [
  { href: "/admin",           label: "Dashboard",  icon: Home,          exact: true  },
  { href: "/admin/pedidos",   label: "Pedidos",    icon: ClipboardList, exact: false },
  { href: "/admin/trades",    label: "Trades",     icon: ArrowLeftRight, exact: false },
  { href: "/admin/estoque",   label: "Estoque",    icon: Warehouse,     exact: false },
  { href: "/admin/catalogo",  label: "Catálogo",   icon: Package,       exact: false },
  { href: "/admin/precos",    label: "Preços",     icon: DollarSign,    exact: false },
  { href: "/admin/economia",  label: "Economia",   icon: TrendingUp,    exact: false },
  { href: "/admin/recompensas", label: "Recompensas", icon: Star,       exact: false },
  { href: "/admin/cupons",    label: "Cupons",     icon: Ticket,        exact: false },
  { href: "/admin/loot-boxes", label: "Loot Boxes", icon: Gift,        exact: false },
  { href: "/admin/contratos", label: "Contratos",  icon: ScrollText,    exact: false },
  { href: "/admin/expedicao", label: "Expedição",  icon: Compass,       exact: false },
  { href: "/admin/faccoes",   label: "Facções",    icon: Flag,          exact: false },
  { href: "/admin/mapas",     label: "Mapas",      icon: Map,           exact: false },
  { href: "/admin/streamers", label: "Streamers",  icon: Radio,         exact: false },
  { href: "/admin/arcpedia",  label: "Arcpedia",   icon: Bot,           exact: false },
  { href: "/admin/crafting",  label: "Crafting",   icon: Hammer,        exact: false },
  { href: "/admin/home",      label: "Home page",  icon: Home,          exact: false },
  { href: "/admin/usuarios",    label: "Usuários",   icon: Users,    exact: false },
  { href: "/admin/indicacoes",  label: "Indicações", icon: UserPlus, exact: false },
  { href: "/admin/sorteios",    label: "Sorteios",   icon: Ticket,   exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="admin-rail">
      {/* Marca + badge admin */}
      <div className="admin-rail-head">
        <Link href="/" className="admin-rail-brand" aria-label="Voltar ao site">
          <BrandMark />
        </Link>
        <div className="admin-rail-tag">
          <Shield size={10} />
          <span>Admin</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="admin-rail-nav">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname?.startsWith(href)
          return (
            <Link key={href} href={href} className={`admin-nav-link${active ? " active" : ""}`}>
              <span className="admin-nav-icon"><Icon size={14} /></span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Voltar ao site */}
      <div className="admin-rail-footer">
        <Link href="/" className="admin-nav-link">
          <span className="admin-nav-icon"><ArrowLeft size={14} /></span>
          <span>Voltar ao site</span>
        </Link>
      </div>
    </aside>
  )
}

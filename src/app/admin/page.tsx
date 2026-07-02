import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  ArrowLeftRight, ClipboardList, Package, Warehouse,
  Star, Ticket, TrendingUp, Flag,
} from "lucide-react"

async function getMetrics() {
  const sb = createAdminClient()

  const [orders, trades, stock, catalog] = await Promise.all([
    sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("trade_acceptances").select("id", { count: "exact", head: true }).in("status", ["pending", "scheduled"]),
    sb.from("stock_items").select("id", { count: "exact", head: true }),
    sb.from("catalog_items").select("id", { count: "exact", head: true }),
  ])

  return {
    pendingOrders:  orders.count  ?? 0,
    activeTrades:   trades.count  ?? 0,
    stockItems:     stock.count   ?? 0,
    catalogItems:   catalog.count ?? 0,
  }
}

const quickLinks = [
  { href: "/admin/pedidos",    label: "Pedidos",     icon: ClipboardList, color: "var(--cyan)"  },
  { href: "/admin/trades",     label: "Trades",      icon: ArrowLeftRight, color: "#a78bfa"     },
  { href: "/admin/estoque",    label: "Estoque",     icon: Warehouse,     color: "var(--green)" },
  { href: "/admin/catalogo",   label: "Catálogo",    icon: Package,       color: "var(--blue)"  },
  { href: "/admin/recompensas", label: "Recompensas", icon: Star,         color: "var(--yellow)"},
  { href: "/admin/cupons",     label: "Cupons",      icon: Ticket,        color: "var(--orange)"},
  { href: "/admin/economia",   label: "Economia",    icon: TrendingUp,    color: "var(--green)" },
  { href: "/admin/faccoes",    label: "Facções",     icon: Flag,          color: "#f97316"      },
]

export default async function AdminDashboard() {
  const m = await getMetrics()

  return (
    <div>
      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Pedidos pendentes",    value: m.pendingOrders,  color: m.pendingOrders  > 0 ? "var(--yellow)" : "var(--gray-500)", href: "/admin/pedidos" },
          { label: "Trades em andamento",  value: m.activeTrades,   color: m.activeTrades   > 0 ? "#a78bfa"       : "var(--gray-500)", href: "/admin/trades"  },
          { label: "Itens no estoque",     value: m.stockItems,     color: "var(--green)",                                              href: "/admin/estoque" },
          { label: "Itens no catálogo",    value: m.catalogItems,   color: "var(--blue)",                                               href: "/admin/catalogo"},
        ].map(({ label, value, color, href }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div style={{ border: "1px solid var(--stroke)", borderRadius: 10, background: "rgba(5,10,16,0.55)", padding: "18px 20px", transition: "border-color 0.15s", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--stroke)")}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", letterSpacing: "0.06em" }}>{label}</p>
              <strong style={{ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }}>{value.toLocaleString("pt-BR")}</strong>
            </div>
          </Link>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <div className="utility-panel">
        <div className="utility-panel-head">
          <strong>Seções</strong>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {quickLinks.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px solid var(--stroke)", borderRadius: 8, background: "rgba(255,255,255,0.02)", transition: "border-color 0.15s, background 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"; e.currentTarget.style.background = "rgba(245,158,11,0.04)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--stroke)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)" }}>
                <span style={{ display: "inline-grid", width: 30, height: 30, placeItems: "center", borderRadius: 8, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`, flexShrink: 0 }}>
                  <Icon size={15} style={{ color }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 950, color: "var(--paper-dim)" }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

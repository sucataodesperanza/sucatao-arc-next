"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Coins, CreditCard, RefreshCw, Package, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import "../../../styles/pedido-confirmado.css"

type OrderItem = {
  itemId: string
  name: string
  type?: string
  rarity?: string
  image?: string
  quantity: number
  mode: "points" | "cash"
  pointsCost?: number
  price?: number
  lineTotal?: number
}

type Order = {
  id: string
  status: string
  payment_method: string
  payment_status: string
  total: number
  items: OrderItem[]
  created_at: string
}

const rarityColors: Record<string, string> = {
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff",
  Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171",
}

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function formatDate(s: string) { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) }
function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

function OrderCard({ order, onSync, syncing }: { order: Order; onSync: (id: string) => void; syncing: boolean }) {
  const isPoints     = order.payment_method === "pontos"
  const isPixPending = !isPoints && (order.payment_status === "pending" || order.payment_status === "processing")
  const total        = isPoints ? order.items.reduce((s, i) => s + (i.pointsCost ?? 0), 0) : order.total

  const statusColor = isPixPending ? "var(--yellow)" : order.payment_status === "paid" ? "var(--green)" : "var(--gray-500)"
  const statusLabel: Record<string, string> = { pending: "Pendente", processing: "Processando", paid: "Pago", cancelled: "Cancelado", failed: "Falhou" }

  return (
    <div className={`pc-order-card${isPixPending ? " pc-order-card--pending" : ""}`}>
      {/* Header do pedido */}
      <div className="pc-order-head">
        <div className="pc-order-type">
          <div className="pc-order-type-icon" style={{ background: isPoints ? "rgba(255,212,0,0.15)" : "rgba(61,242,139,0.15)", color: isPoints ? "var(--yellow)" : "var(--green)" }}>
            {isPoints ? <Coins size={15} /> : <CreditCard size={15} />}
          </div>
          <div>
            <strong>{isPoints ? "Resgate com Pontos" : "Compra com Saldo Real"}</strong>
            <span style={{ display: "block", fontSize: 10, color: "var(--gray-500)", marginTop: 2 }}>
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>
        <span className="pc-status-badge" style={{ color: statusColor, borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`, background: `color-mix(in srgb, ${statusColor} 8%, transparent)` }}>
          {statusLabel[order.payment_status] ?? order.payment_status}
        </span>
      </div>

      {/* Lista de itens */}
      <div className="pc-items">
        {order.items.map((item, idx) => (
          <div key={idx} className="pc-item">
            <div className="pc-item-media" style={{ "--rarity-color": rarityColors[item.rarity ?? "Unknown"] } as React.CSSProperties}>
              {item.image
                ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
                : <div className="pc-item-placeholder">{item.name[0]?.toUpperCase()}</div>}
            </div>
            <div className="pc-item-info">
              <strong>{item.name}</strong>
              <span>{item.type ?? "Item"}{item.rarity ? ` · ${item.rarity}` : ""}</span>
            </div>
            <div className="pc-item-qty">
              <span>×{item.quantity}</span>
            </div>
            <div className="pc-item-value">
              <strong>{formatNumber(item.mode === "points" ? item.pointsCost : item.lineTotal)}</strong>
              <span>{item.mode === "points" ? "pts" : "R$"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="pc-order-footer">
        <span>Total do pedido</span>
        <strong style={{ color: isPoints ? "var(--yellow)" : "var(--green)" }}>
          {isPoints ? `${formatNumber(total)} pts` : `R$ ${total.toFixed(2).replace(".", ",")}`}
        </strong>
      </div>

      {/* PIX pendente */}
      {isPixPending && (
        <div className="pc-pix-pending">
          <p>Aguardando confirmação do pagamento PIX pelo Mercado Pago.</p>
          <button type="button" className="pc-verify-btn" onClick={() => onSync(order.id)} disabled={syncing}>
            <RefreshCw size={13} className={syncing ? "pc-spin" : ""} />
            {syncing ? "Verificando..." : "Verificar pagamento"}
          </button>
        </div>
      )}
    </div>
  )
}

function PedidoConfirmadoContent() {
  const searchParams = useSearchParams()
  const ids          = (searchParams.get("ids") ?? "").split(",").filter(Boolean)
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const syncedRef = useRef(new Set<string>())
  const [hasDiscord, setHasDiscord] = useState<boolean | null>(null)

  async function fetchOrders() {
    const supabase = createClient()
    const { data } = await supabase.from("orders").select("*").in("id", ids)
    setOrders((data ?? []) as Order[])
    return (data ?? []) as Order[]
  }

  async function syncOrder(orderId: string) {
    if (syncedRef.current.has(orderId)) return
    syncedRef.current.add(orderId)
    setSyncingIds(prev => new Set(prev).add(orderId))
    try {
      await fetch("/api/store/sync-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) })
      await fetchOrders()
    } finally {
      setSyncingIds(prev => { const next = new Set(prev); next.delete(orderId); return next })
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from("profiles").select("discord_id").eq("id", user.id).single().then(({ data }) => {
        setHasDiscord(Boolean(data?.discord_id))
      })
    })
    if (ids.length === 0) { setLoading(false); return }
    fetchOrders().then(loadedOrders => {
      setLoading(false)
      loadedOrders
        .filter(o => o.payment_method !== "pontos" && (o.payment_status === "pending" || o.payment_status === "processing") && !syncedRef.current.has(o.id))
        .forEach(o => syncOrder(o.id))
      fetch("/api/inventory/reconcile", { method: "POST" }).catch(() => {})
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <div className="pc-loading">
      <RefreshCw size={24} className="pc-spin" style={{ color: "var(--cyan)", opacity: 0.6 }} />
      <span>Carregando pedido...</span>
    </div>
  )

  if (orders.length === 0) return (
    <div className="pc-empty">
      <Package size={40} style={{ opacity: 0.25 }} />
      <p>Não encontramos esse pedido.</p>
      <Link href="/loja" className="pc-btn pc-btn--primary">Voltar ao catálogo</Link>
    </div>
  )

  const totalItems = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  const hasPixOrder = orders.some(o => o.payment_method !== "pontos")
  const showDiscordCard = hasPixOrder && hasDiscord === false

  return (
    <div className="pc-content">
      {orders.map(o => (
        <OrderCard key={o.id} order={o} onSync={syncOrder} syncing={syncingIds.has(o.id)} />
      ))}

      {showDiscordCard && (
        <div style={{ padding: 20, borderRadius: 14, background: "rgba(88,101,242,0.10)", border: "1px solid rgba(88,101,242,0.28)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(88,101,242,0.2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="20" height="15" viewBox="0 0 24 18" fill="none" style={{ color: "#7289da" }}>
                <path d="M20.317 1.492a19.825 19.825 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03zM8.02 12.278c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <strong style={{ fontSize: 14, color: "#a5b4fc", display: "block" }}>Conecte seu Discord</strong>
              <span style={{ fontSize: 12, color: "var(--gray-500)" }}>Melhore a experiência nos seus próximos pedidos</span>
            </div>
          </div>
          <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none", display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--gray-400)" }}>
            <li>📦 Canal privado criado no Discord para cada pedido PIX</li>
            <li>💬 Combine a entrega in-game diretamente com nossa equipe</li>
            <li>🔔 DMs automáticas de pagamento confirmado e recompensas</li>
          </ul>
          <a href="/api/auth/discord?return_to=/perfil" className="pc-btn pc-btn--primary" style={{ background: "#5865f2", border: "none", textDecoration: "none" }}>
            Conectar Discord agora
          </a>
        </div>
      )}

      <div className="pc-actions">
        <Link href="/loja" className="pc-btn pc-btn--primary">
          <ShoppingBag size={15} /> Continuar comprando
        </Link>
        <Link href="/inventario" className="pc-btn pc-btn--outline">
          Ver inventário
        </Link>
      </div>

      <p className="pc-hint">
        {totalItems} item{totalItems !== 1 ? "s" : ""} adicionado{totalItems !== 1 ? "s" : ""} ao seu inventário.
      </p>
    </div>
  )
}

export default function PedidoConfirmadoPage() {
  return (
    <div className="pc-page">
      {/* Hero celebratório */}
      <div className="pc-hero">
        <div className="pc-hero-icon">
          <div className="pc-hero-glow" />
          <CheckCircle size={56} strokeWidth={1.5} />
        </div>
        <h1 className="pc-hero-title">Pedido Confirmado!</h1>
        <p className="pc-hero-subtitle">Obrigado pela sua compra. Seus itens já estão disponíveis no inventário.</p>
      </div>

      <Suspense fallback={
        <div className="pc-loading">
          <RefreshCw size={24} className="pc-spin" style={{ color: "var(--cyan)", opacity: 0.6 }} />
          <span>Carregando...</span>
        </div>
      }>
        <PedidoConfirmadoContent />
      </Suspense>
    </div>
  )
}

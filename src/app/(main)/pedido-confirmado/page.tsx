"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
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
  Common: "#8b99aa", Uncommon: "#3df28b", Rare: "#5fa8ff", Epic: "#b477ff", Legendary: "#ffd400", Unknown: "#566171"
}

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente", processing: "Processando", paid: "Pago", cancelled: "Cancelado", failed: "Falhou",
}

const paymentBannerLabels: Record<string, string> = {
  success: "Pagamento aprovado! Seu pedido jÃ¡ estÃ¡ sendo processado.",
  pending: "Pagamento via PIX pendente. Assim que o Mercado Pago confirmar, atualizaremos seu pedido automaticamente.",
  failure: "O pagamento nÃ£o foi concluÃ­do. VocÃª pode tentar novamente pelo carrinho.",
}

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function formatDate(s: string) { return new Date(s).toLocaleString("pt-BR") }

function resolveImage(image?: string) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

function OrderCard({ order, onSync, syncing }: { order: Order; onSync: (orderId: string) => void; syncing: boolean }) {
  const isPoints = order.payment_method === "pontos"
  const total = isPoints ? order.items.reduce((sum, i) => sum + (i.pointsCost ?? 0), 0) : order.total
  const isPixPending = !isPoints && (order.payment_status === "pending" || order.payment_status === "processing")

  return (
    <section className="cart-group">
      <div className="utility-panel-head">
        <strong>{isPoints ? "Resgate com pontos" : "Compra com saldo real"}</strong>
        <small className={isPixPending ? "cart-summary-warn" : ""}>{paymentStatusLabels[order.payment_status] ?? order.payment_status}</small>
      </div>
      <div className="cart-list">
        {order.items.map((item, idx) => (
          <div key={idx} className="cart-item">
            <div className="cart-item-media" style={{ "--rarity-color": rarityColors[item.rarity ?? "Unknown"] } as React.CSSProperties}>
              {item.image
                ? <img src={resolveImage(item.image)} alt={item.name} loading="lazy" />
                : <div className="placeholder">{item.name[0]?.toUpperCase()}</div>}
            </div>
            <div className="cart-item-info">
              <strong>{item.name}</strong>
              <span>{item.type ?? "Item"} Â· Quantidade: {item.quantity}</span>
            </div>
            <div className="cart-item-value">
              <strong>{formatNumber(item.mode === "points" ? item.pointsCost : item.lineTotal)}</strong>
              <span>{item.mode === "points" ? "pontos" : "valor real"}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="cart-summary-row">
        <span>{isPoints ? "Total em pontos" : "Total"}</span>
        <strong>{formatNumber(total)}</strong>
      </div>
      <div className="cart-summary-row">
        <span>Pedido em</span>
        <strong>{formatDate(order.created_at)}</strong>
      </div>
      {isPixPending && (
        <>
          <p className="modal-purchase-status">Aguardando confirmaÃ§Ã£o do pagamento PIX no Mercado Pago.</p>
          <button type="button" className="cart-checkout-button cash" onClick={() => onSync(order.id)} disabled={syncing}>
            {syncing ? "Verificando..." : "Verificar pagamento"}
          </button>
        </>
      )}
    </section>
  )
}

function PedidoConfirmadoContent() {
  const searchParams = useSearchParams()
  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean)
  const paymentBanner = searchParams.get("payment")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())
  const syncedRef = useRef(new Set<string>()) // evita sincronizar o mesmo pedido múltiplas vezes

  async function fetchOrders() {
    const supabase = createClient()
    const { data } = await supabase.from("orders").select("*").in("id", ids)
    setOrders((data ?? []) as Order[])
    return (data ?? []) as Order[]
  }

  async function syncOrder(orderId: string) {
    if (syncedRef.current.has(orderId)) return // já sincronizado — ignora
    syncedRef.current.add(orderId)

    setSyncingIds(prev => new Set(prev).add(orderId))
    try {
      await fetch("/api/store/sync-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      await fetchOrders()
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return }
    fetchOrders().then(loadedOrders => {
      setLoading(false)
      // Só sincroniza ordens PENDENTES e que ainda não foram sincronizadas nesta sessão
      loadedOrders
        .filter(o =>
          o.payment_method !== "pontos" &&
          (o.payment_status === "pending" || o.payment_status === "processing") &&
          !syncedRef.current.has(o.id)
        )
        .forEach(o => syncOrder(o.id))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return <p className="modal-purchase-status">Carregando pedido...</p>
  }

  if (orders.length === 0) {
    return (
      <div className="cart-empty">
        <p>NÃ£o encontramos esse pedido.</p>
        <Link href="/loja">Voltar ao catÃ¡logo</Link>
      </div>
    )
  }

  return (
    <div className="cart-layout">
      {paymentBanner && paymentBannerLabels[paymentBanner] && (
        <p className="modal-purchase-status">{paymentBannerLabels[paymentBanner]}</p>
      )}
      {orders.map(order => (
        <OrderCard key={order.id} order={order} onSync={syncOrder} syncing={syncingIds.has(order.id)} />
      ))}
      <div className="cart-confirm-actions">
        <Link href="/loja" className="cart-checkout-button">Continuar comprando</Link>
        <Link href="/perfil" className="cart-checkout-button cash">Ver no perfil</Link>
      </div>
    </div>
  )
}

export default function PedidoConfirmadoPage() {
  return (
    <section className="utility-page">
      <h2>Pedido confirmado</h2>
      <p>Resumo do(s) pedido(s) gerado(s) a partir do seu carrinho.</p>
      <Suspense fallback={<p className="modal-purchase-status">Carregando...</p>}>
        <PedidoConfirmadoContent />
      </Suspense>
    </section>
  )
}

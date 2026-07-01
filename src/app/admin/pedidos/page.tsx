"use client"

import { useCallback, useEffect, useState } from "react"
import "../../../styles/admin-pedidos.css"

type OrderItem = {
  itemId?: string
  name: string
  type?: string | null
  rarity?: string | null
  image?: string | null
  quantity: number
  mode?: "points" | "cash"
  pointsCost?: number
  price?: number
  lineTotal?: number
}

type Order = {
  id: string
  user_id: string | null
  total: number
  status: string
  payment_method: string | null
  payment_status: string
  items: OrderItem[]
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  delivered_at: string | null
  discord_channel_id: string | null
  customer_name: string | null
  customer_email: string | null
  customer_game_id: string | null
}

const PAGE_SIZE = 20

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "12px",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

const statusLabels: Record<string, string> = {
  pending: "Pendente", completed: "Concluído", cancelled: "Cancelado",
}

const statusColors: Record<string, string> = {
  pending: "var(--orange)", completed: "var(--green)", cancelled: "var(--red)",
}

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente", processing: "Processando", paid: "Pago", failed: "Falhou",
}

const paymentStatusColors: Record<string, string> = {
  pending: "var(--orange)", processing: "var(--blue)", paid: "var(--green)", failed: "var(--red)",
}

const paymentMethodLabels: Record<string, string> = {
  pontos: "Pontos", loja_oficial: "PIX", saldo_real: "Saldo real",
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block", border: `1px solid ${color}`, color, background: "rgba(255,255,255,0.04)",
    padding: "3px 8px", fontSize: "10px", fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap",
  }
}

function formatNumber(n: number | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTime(s: string) {
  return new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDay(s: string) {
  return new Date(s).toLocaleDateString("pt-BR")
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString("pt-BR")
}

function orderTotal(order: Order) {
  if (order.payment_method === "pontos") {
    const points = order.items.reduce((sum, i) => sum + (i.pointsCost ?? 0), 0)
    return `${points.toLocaleString("pt-BR")} pontos`
  }
  return `R$ ${formatNumber(order.total)}`
}

function itemTotal(item: OrderItem) {
  if (item.mode === "points") return `${(item.pointsCost ?? 0).toLocaleString("pt-BR")} pontos`
  return `R$ ${formatNumber(item.lineTotal ?? (item.price ?? 0) * item.quantity)}`
}

function resolveImage(image?: string | null) {
  if (!image) return undefined
  return image.startsWith("http") ? image : `/${image}`
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [confirmingDelivery, setConfirmingDelivery] = useState(false)
  const [deliveryMsg, setDeliveryMsg] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    if (q) params.set("q", q)
    if (status !== "all") params.set("status", status)
    if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus)

    const res = await fetch(`/api/admin/orders?${params.toString()}`)
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setOrders(body.items ?? [])
      setTotal(body.total ?? 0)
    }
    setLoading(false)
  }, [page, q, status, paymentStatus])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="utility-panel">
      <div className="utility-panel-head">
        <strong>Pedidos</strong>
        <small>{total} {total === 1 ? "pedido" : "pedidos"}</small>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", margin: "12px 0 16px" }}>
        <input
          type="search"
          placeholder="Buscar por ID, cliente, item ou referência..."
          value={q}
          onChange={e => { setPage(1); setQ(e.target.value) }}
          style={{ ...inputStyle, flex: "1 1 260px" }}
        />
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value) }} style={inputStyle}>
          <option value="all">Todos os status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={paymentStatus} onChange={e => { setPage(1); setPaymentStatus(e.target.value) }} style={inputStyle}>
          <option value="all">Todos os pagamentos</option>
          {Object.entries(paymentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ padding: "8px" }}>ID do pedido</th>
                <th style={{ padding: "8px" }}>Cliente</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Horário</th>
                <th style={{ padding: "8px" }}>Dia</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top", cursor: "pointer" }}
                >
                  <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--cyan)" }}>
                    {order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <strong>{order.customer_name ?? "Sem nome"}</strong>
                    <br />
                    <span style={{ color: "var(--muted)" }}>{order.customer_email ?? "—"}</span>
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span style={badgeStyle(statusColors[order.status] ?? "var(--muted)")}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatTime(order.created_at)}</td>
                  <td style={{ padding: "8px", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDay(order.created_at)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum pedido encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
        <button
          type="button"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ ...btnStyle, opacity: page <= 1 ? 0.4 : 1 }}
        >
          Anterior
        </button>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Página {page} de {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{ ...btnStyle, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Próxima
        </button>
      </div>

      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="marker-modal" style={{ maxWidth: "640px" }} onClick={e => e.stopPropagation()}>
            <p className="modal-kicker">Pedido {selectedOrder.id.slice(0, 8).toUpperCase()}</p>
            <h2 style={{ fontSize: "20px" }}>{selectedOrder.customer_name ?? "Sem nome"}</h2>
            <p style={{ margin: "-10px 0 0", color: "var(--muted)", fontSize: "13px" }}>{selectedOrder.customer_email ?? "—"}</p>
            <p style={{ margin: "-10px 0 0", color: "var(--muted)", fontSize: "13px" }}>ID do jogo: {selectedOrder.customer_game_id ?? "—"}</p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span style={badgeStyle(statusColors[selectedOrder.status] ?? "var(--muted)")}>
                {statusLabels[selectedOrder.status] ?? selectedOrder.status}
              </span>
              <span style={badgeStyle(paymentStatusColors[selectedOrder.payment_status] ?? "var(--muted)")}>
                {paymentStatusLabels[selectedOrder.payment_status] ?? selectedOrder.payment_status}
              </span>
              <span style={{ ...badgeStyle("var(--line)"), color: "var(--text)" }}>
                {paymentMethodLabels[selectedOrder.payment_method ?? ""] ?? selectedOrder.payment_method ?? "—"}
              </span>
            </div>

            <div style={{ fontSize: "12px", color: "var(--muted)", display: "grid", gap: "4px" }}>
              <span>Criado em: {formatDateTime(selectedOrder.created_at)}</span>
              {selectedOrder.paid_at && <span>Pago em: {formatDateTime(selectedOrder.paid_at)}</span>}
              {selectedOrder.cancelled_at && <span>Cancelado em: {formatDateTime(selectedOrder.cancelled_at)}</span>}
              {selectedOrder.delivered_at && <span style={{ color: "var(--green)" }}>Entrega confirmada em: {formatDateTime(selectedOrder.delivered_at)}</span>}
              {selectedOrder.discord_channel_id && !selectedOrder.delivered_at && (
                <span style={{ color: "#7289da" }}>Canal Discord aberto: #{selectedOrder.id.slice(0, 8)}</span>
              )}
            </div>

            <div>
              <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)" }}>Itens</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontSize: "12px", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "4px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {resolveImage(item.image) ? (
                        <img src={resolveImage(item.image)} alt={item.name} style={{ width: "24px", height: "24px", objectFit: "contain" }} />
                      ) : (
                        <span style={{ width: "24px", height: "24px", border: "1px solid var(--line)", display: "inline-block" }} />
                      )}
                      {item.quantity}x {item.name}
                    </span>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{itemTotal(item)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "14px" }}>
              <span>Total</span>
              <span>{orderTotal(selectedOrder)}</span>
            </div>

            {selectedOrder.payment_method === "loja_oficial" && selectedOrder.payment_status === "paid" && !selectedOrder.delivered_at && (
              <div style={{ padding: "14px", borderRadius: "8px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <p style={{ margin: "0 0 10px", fontSize: "12px", color: "var(--muted)" }}>
                  {selectedOrder.discord_channel_id
                    ? "Ao confirmar, o canal Discord do pedido será encerrado automaticamente."
                    : "Confirme a entrega quando o item tiver sido entregue ao comprador."}
                </p>
                {deliveryMsg === "ok" ? (
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--green)", fontWeight: 800 }}>✓ Entrega confirmada com sucesso.</p>
                ) : (
                  <button
                    type="button"
                    disabled={confirmingDelivery}
                    onClick={async () => {
                      setConfirmingDelivery(true)
                      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/confirm-delivery`, { method: "POST" })
                      setConfirmingDelivery(false)
                      if (res.ok) {
                        const now = new Date().toISOString()
                        setSelectedOrder(o => o ? { ...o, delivered_at: now, discord_channel_id: null } : o)
                        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, delivered_at: now, discord_channel_id: null } : o))
                        setDeliveryMsg("ok")
                      } else {
                        setDeliveryMsg("error")
                        setTimeout(() => setDeliveryMsg(""), 3000)
                      }
                    }}
                    style={{ ...btnStyle, borderColor: "var(--green)", color: "var(--green)" }}
                  >
                    {confirmingDelivery ? "Confirmando..." : "Confirmar entrega"}
                  </button>
                )}
                {deliveryMsg === "error" && (
                  <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--red)" }}>Erro ao confirmar. Tente novamente.</p>
                )}
              </div>
            )}

            <div className="marker-form-meta">
              <span />
              <button type="button" onClick={() => { setSelectedOrder(null); setDeliveryMsg("") }} style={btnStyle}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

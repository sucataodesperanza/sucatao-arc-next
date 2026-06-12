"use client"

import { useCallback, useEffect, useState } from "react"

type OrderItem = {
  itemId?: string
  name: string
  type?: string | null
  rarity?: string | null
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
  payment_provider: string | null
  payment_provider_status: string | null
  payment_reference: string | null
  items: OrderItem[]
  created_at: string
  paid_at: string | null
  cancelled_at: string | null
  customer_name: string | null
  customer_email: string | null
  webhook_pending: boolean
}

const PAGE_SIZE = 20

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "12px",
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

function formatDate(s: string) {
  return new Date(s).toLocaleString("pt-BR")
}

function formatElapsed(s: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(s).getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h${mins}m` : `${mins}m`
}

function orderTotal(order: Order) {
  if (order.payment_method === "pontos") {
    const points = order.items.reduce((sum, i) => sum + (i.pointsCost ?? 0), 0)
    return `${points.toLocaleString("pt-BR")} pontos`
  }
  return `R$ ${formatNumber(order.total)}`
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [paymentStatus, setPaymentStatus] = useState("all")
  const [loading, setLoading] = useState(false)

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
                <th style={{ padding: "8px" }}>Itens</th>
                <th style={{ padding: "8px" }}>Total</th>
                <th style={{ padding: "8px" }}>Pagamento</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const visibleItems = order.items.slice(0, 3)
                const extraCount = order.items.length - visibleItems.length

                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top" }}>
                    <td style={{ padding: "8px", fontFamily: "monospace", color: "var(--cyan)" }}>
                      {order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: "8px" }}>
                      <strong>{order.customer_name ?? "Sem nome"}</strong>
                      <br />
                      <span style={{ color: "var(--muted)" }}>{order.customer_email ?? "—"}</span>
                    </td>
                    <td style={{ padding: "8px" }}>
                      {visibleItems.map((item, idx) => (
                        <div key={idx}>{item.quantity}x {item.name}</div>
                      ))}
                      {extraCount > 0 && <div style={{ color: "var(--muted)" }}>+{extraCount}</div>}
                    </td>
                    <td style={{ padding: "8px", fontWeight: 800 }}>{orderTotal(order)}</td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
                        <span style={badgeStyle(paymentStatusColors[order.payment_status] ?? "var(--muted)")}>
                          {paymentStatusLabels[order.payment_status] ?? order.payment_status}
                        </span>
                        {order.webhook_pending && (
                          <span style={badgeStyle("var(--orange)")}>
                            Webhook pendente · {formatElapsed(order.created_at)}
                          </span>
                        )}
                        <span style={{ color: "var(--text)" }}>
                          {paymentMethodLabels[order.payment_method ?? ""] ?? order.payment_method ?? "—"}
                        </span>
                        {order.payment_provider && (
                          <span style={{ color: "var(--muted)" }}>{order.payment_provider}</span>
                        )}
                        {order.payment_provider_status && (
                          <span style={{ color: "var(--muted)" }}>Status do provedor: {order.payment_provider_status}</span>
                        )}
                        {order.payment_reference && (
                          <span style={{ color: "var(--muted)", wordBreak: "break-all" }}>{order.payment_reference}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <span style={badgeStyle(statusColors[order.status] ?? "var(--muted)")}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(order.created_at)}</td>
                  </tr>
                )
              })}
              {orders.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum pedido encontrado.</td></tr>
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
          style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)", padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer", opacity: page <= 1 ? 0.4 : 1 }}
        >
          Anterior
        </button>
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>Página {page} de {totalPages}</span>
        <button
          type="button"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)", padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer", opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}

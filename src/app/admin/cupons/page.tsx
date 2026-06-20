"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
import { useConfirm } from "@/components/admin-notifications"
import "../../../styles/admin-cupons.css"

type Coupon = {
  id: string
  code: string
  discount: number
  discount_type: "percentage" | "fixed"
  usage_count: number
  usage_limit: number | null
  expiration_date: string | null
  status: "active" | "inactive"
  total_discounted: number
  created_at: string
}

type FormState = {
  code: string
  discount: string
  discount_type: "percentage" | "fixed"
  usage_limit: string
  expiration_date: string
  status: "active" | "inactive"
}

const EMPTY_FORM: FormState = { code: "", discount: "", discount_type: "percentage", usage_limit: "", expiration_date: "", status: "active" }

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)", border: "1px solid var(--line)", color: "var(--text)",
  padding: "8px 10px", fontSize: "12px",
}

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  padding: "8px 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer",
}

const iconBtnStyle: React.CSSProperties = {
  border: "1px solid var(--line)", background: "rgba(255,255,255,0.04)", color: "var(--text)",
  width: "30px", height: "30px", display: "grid", placeItems: "center", cursor: "pointer",
}

function formatNumber(n: number | undefined) {
  return (n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(s: string | null) {
  if (!s) return "Sem expiração"
  return new Date(`${s}T00:00:00`).toLocaleDateString("pt-BR")
}

function isExpired(coupon: Coupon) {
  if (!coupon.expiration_date) return false
  return new Date(`${coupon.expiration_date}T23:59:59`).getTime() < Date.now()
}

function discountLabel(coupon: Coupon) {
  return coupon.discount_type === "percentage" ? `${coupon.discount}%` : `R$ ${formatNumber(coupon.discount)}`
}

function generateRandomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export default function AdminCuponsPage() {
  const { confirm } = useConfirm()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)

    const res = await fetch(`/api/admin/coupons?${params.toString()}`)
    const body = await res.json().catch(() => ({}))
    if (res.ok) setCoupons(body.items ?? [])
    setLoading(false)
  }, [q])

  useEffect(() => {
    const timeout = setTimeout(load, 300)
    return () => clearTimeout(timeout)
  }, [load])

  function openCreateModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError("")
    setModalOpen(true)
  }

  function openEditModal(coupon: Coupon) {
    setEditingId(coupon.id)
    setForm({
      code: coupon.code,
      discount: String(coupon.discount),
      discount_type: coupon.discount_type,
      usage_limit: coupon.usage_limit === null ? "" : String(coupon.usage_limit),
      expiration_date: coupon.expiration_date ?? "",
      status: coupon.status,
    })
    setFormError("")
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError("")

    const payload = {
      code: form.code,
      discount: form.discount,
      discount_type: form.discount_type,
      usage_limit: form.usage_limit === "" ? null : form.usage_limit,
      expiration_date: form.expiration_date === "" ? null : form.expiration_date,
      status: form.status,
    }

    const res = await fetch(editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    setSaving(false)

    if (res.ok) {
      setModalOpen(false)
      load()
    } else {
      setFormError(body.error ?? "Erro ao salvar cupom.")
    }
  }

  async function toggleStatus(coupon: Coupon) {
    const nextStatus = coupon.status === "active" ? "inactive" : "active"
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, status: nextStatus } : c))
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
  }

  async function removeCoupon(coupon: Coupon) {
    const ok = await confirm(`Remover o cupom ${coupon.code}?`)
    if (!ok) return
    setCoupons(prev => prev.filter(c => c.id !== coupon.id))
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" })
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code)
  }

  const activeCount = coupons.filter(c => c.status === "active").length
  const totalUses = coupons.reduce((sum, c) => sum + (c.usage_count ?? 0), 0)
  const totalDiscounted = coupons.reduce((sum, c) => sum + (c.total_discounted ?? 0), 0)

  return (
    <>
      <div className="utility-panel" style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Pesquisar cupom..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
        <button type="button" onClick={openCreateModal} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Plus size={14} /> Criar cupom
        </button>
      </div>

      <div className="utility-stats cols-4">
        <article>
          <span>Cupons ativos</span>
          <strong>{activeCount}</strong>
        </article>
        <article>
          <span>Cupons utilizados</span>
          <strong>{totalUses}</strong>
        </article>
        <article>
          <span>Valor descontado</span>
          <strong>R$ {formatNumber(totalDiscounted)}</strong>
        </article>
        <article>
          <span>Economia total</span>
          <strong>R$ {formatNumber(totalDiscounted)}</strong>
        </article>
      </div>

      <div className="utility-panel" style={{ marginTop: "16px" }}>
        <div className="utility-panel-head">
          <strong>Cupons</strong>
          <small>{coupons.length} {coupons.length === 1 ? "cupom" : "cupons"}</small>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}>Código</th>
                  <th style={{ padding: "8px" }}>Desconto</th>
                  <th style={{ padding: "8px" }}>Uso</th>
                  <th style={{ padding: "8px" }}>Valor descontado</th>
                  <th style={{ padding: "8px" }}>Expiração</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const expired = isExpired(coupon)
                  const statusColor = coupon.status !== "active" ? "var(--muted)" : expired ? "var(--red)" : "var(--green)"
                  const statusLabel = coupon.status === "active" ? (expired ? "Expirado" : "Ativo") : "Inativo"
                  return (
                    <tr key={coupon.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--cyan)" }}>{coupon.code}</span>
                          <button type="button" onClick={() => copyCode(coupon.code)} title="Copiar código" style={{ ...iconBtnStyle, width: "22px", height: "22px", border: "none", background: "none" }}>
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "8px" }}>{discountLabel(coupon)}</td>
                      <td style={{ padding: "8px", color: "var(--muted)" }}>{coupon.usage_count}/{coupon.usage_limit ?? "∞"}</td>
                      <td style={{ padding: "8px", color: "var(--green)" }}>R$ {formatNumber(coupon.total_discounted)}</td>
                      <td style={{ padding: "8px", color: expired ? "var(--red)" : "var(--muted)", whiteSpace: "nowrap" }}>{formatDate(coupon.expiration_date)}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          display: "inline-block", border: `1px solid ${statusColor}`, color: statusColor, background: "rgba(255,255,255,0.04)",
                          padding: "3px 8px", fontSize: "10px", fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap",
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button type="button" onClick={() => toggleStatus(coupon)} title={coupon.status === "active" ? "Desativar" : "Ativar"} style={iconBtnStyle}>
                            {coupon.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button type="button" onClick={() => openEditModal(coupon)} title="Editar" style={iconBtnStyle}>
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => removeCoupon(coupon)} title="Remover" style={{ ...iconBtnStyle, borderColor: "var(--red)", color: "var(--red)" }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {coupons.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhum cupom encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <form onSubmit={handleSubmit} className="marker-modal" style={{ maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
            <p className="modal-kicker">{editingId ? "Editar cupom" : "Criar cupom"}</p>
            <h2 style={{ fontSize: "20px" }}>{editingId ? "Editar cupom" : "Novo cupom"}</h2>

            <div className="marker-form-grid">
              <label>
                <span>Código</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="EX: DESCONTO10"
                    maxLength={32}
                    required
                    minLength={3}
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => setForm(f => ({ ...f, code: generateRandomCode() }))} style={btnStyle}>
                    Gerar
                  </button>
                </div>
              </label>

              <label>
                <span>Tipo de desconto</span>
                <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value === "fixed" ? "fixed" : "percentage" }))}>
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </label>

              <label>
                <span>Valor do desconto {form.discount_type === "percentage" ? "(%)" : "(R$)"}</span>
                <input
                  type="number"
                  value={form.discount}
                  onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                  placeholder={form.discount_type === "percentage" ? "0-100" : "0.00"}
                  min={0}
                  max={form.discount_type === "percentage" ? 100 : undefined}
                  step="0.01"
                  required
                />
              </label>

              <label>
                <span>Limite de uso (vazio = ilimitado)</span>
                <input
                  type="number"
                  value={form.usage_limit}
                  onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                  placeholder="Ilimitado"
                  min={1}
                  step="1"
                />
              </label>

              <label>
                <span>Data de expiração (vazio = sem validade)</span>
                <input
                  type="date"
                  value={form.expiration_date}
                  onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                />
              </label>

              <label>
                <span>Status</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value === "inactive" ? "inactive" : "active" }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </div>

            <div className="marker-form-meta">
              <span>{formError}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={closeModal} style={btnStyle}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

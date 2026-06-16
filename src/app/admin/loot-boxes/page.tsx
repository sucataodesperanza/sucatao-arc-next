"use client"

import { useCallback, useEffect, useState } from "react"
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react"
import "../../../styles/admin-loot-boxes.css"

type Rarity = "common" | "rare" | "epic" | "legendary"

type DropRates = { common: number; rare: number; epic: number; legendary: number }

type LootBox = {
  id: string
  name: string
  price: number
  image_url: string
  rarity: Rarity
  description: string
  possible_rewards: string[]
  drop_rates: DropRates
  times_opened: number
  total_revenue: number
  status: "active" | "inactive"
  created_at: string
}

type FormState = {
  name: string
  price: string
  image_url: string
  rarity: Rarity
  description: string
  possible_rewards: string
  drop_rates: DropRates
  status: "active" | "inactive"
}

const EMPTY_FORM: FormState = {
  name: "",
  price: "",
  image_url: "",
  rarity: "common",
  description: "",
  possible_rewards: "",
  drop_rates: { common: 70, rare: 25, epic: 4, legendary: 1 },
  status: "active",
}

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Comum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
}

const RARITY_COLORS: Record<Rarity, string> = {
  common: "var(--muted)",
  rare: "var(--blue)",
  epic: "var(--cyan)",
  legendary: "var(--orange)",
}

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

export default function AdminLootBoxesPage() {
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([])
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/admin/loot-boxes")
    const body = await res.json().catch(() => ({}))
    if (res.ok) setLootBoxes(body.items ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreateModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError("")
    setModalOpen(true)
  }

  function openEditModal(lootBox: LootBox) {
    setEditingId(lootBox.id)
    setForm({
      name: lootBox.name,
      price: String(lootBox.price),
      image_url: lootBox.image_url,
      rarity: lootBox.rarity,
      description: lootBox.description,
      possible_rewards: lootBox.possible_rewards.join("\n"),
      drop_rates: { ...lootBox.drop_rates },
      status: lootBox.status,
    })
    setFormError("")
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function handleDropRateChange(rarity: Rarity, value: string) {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0))
    setForm(f => ({ ...f, drop_rates: { ...f.drop_rates, [rarity]: numValue } }))
  }

  const totalDropRate = Object.values(form.drop_rates).reduce((sum, rate) => sum + rate, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const possibleRewards = form.possible_rewards.split("\n").map(r => r.trim()).filter(Boolean)

    if (possibleRewards.length === 0) {
      setFormError("Adicione pelo menos uma recompensa possível.")
      return
    }

    if (totalDropRate !== 100) {
      setFormError(`As taxas de drop devem somar 100% (atual: ${totalDropRate}%)`)
      return
    }

    setSaving(true)
    setFormError("")

    const payload = {
      name: form.name,
      price: form.price,
      image_url: form.image_url,
      rarity: form.rarity,
      description: form.description,
      possible_rewards: possibleRewards,
      drop_rates: form.drop_rates,
      status: form.status,
    }

    const res = await fetch(editingId ? `/api/admin/loot-boxes/${editingId}` : "/api/admin/loot-boxes", {
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
      setFormError(body.error ?? "Erro ao salvar loot box.")
    }
  }

  async function toggleStatus(lootBox: LootBox) {
    const nextStatus = lootBox.status === "active" ? "inactive" : "active"
    setLootBoxes(prev => prev.map(l => l.id === lootBox.id ? { ...l, status: nextStatus } : l))
    await fetch(`/api/admin/loot-boxes/${lootBox.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
  }

  async function removeLootBox(lootBox: LootBox) {
    if (!confirm(`Tem certeza que deseja excluir "${lootBox.name}"?`)) return
    setLootBoxes(prev => prev.filter(l => l.id !== lootBox.id))
    await fetch(`/api/admin/loot-boxes/${lootBox.id}`, { method: "DELETE" })
  }

  const filtered = lootBoxes.filter(l => l.name.toLowerCase().includes(q.trim().toLowerCase()))
  const activeCount = lootBoxes.filter(l => l.status === "active").length
  const totalOpened = lootBoxes.reduce((sum, l) => sum + (l.times_opened ?? 0), 0)
  const totalRevenue = lootBoxes.reduce((sum, l) => sum + (l.total_revenue ?? 0), 0)

  return (
    <>
      <div className="utility-panel" style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder="Pesquisar loot boxes..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 220px" }}
        />
        <button type="button" onClick={openCreateModal} style={{ ...btnStyle, borderColor: "var(--cyan)", color: "var(--cyan)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Plus size={14} /> Criar Loot Box
        </button>
      </div>

      <div className="utility-stats">
        <article>
          <span>Loot Boxes Ativas</span>
          <strong>{activeCount} de {lootBoxes.length} total</strong>
        </article>
        <article>
          <span>Total Abertas</span>
          <strong>{totalOpened}</strong>
        </article>
        <article>
          <span>Receita Total</span>
          <strong>R$ {formatNumber(totalRevenue)}</strong>
        </article>
      </div>

      <div className="utility-panel" style={{ marginTop: "16px" }}>
        <div className="utility-panel-head">
          <strong>Loot Boxes</strong>
          <small>{filtered.length} {filtered.length === 1 ? "loot box" : "loot boxes"}</small>
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ padding: "8px" }}>Loot Box</th>
                  <th style={{ padding: "8px" }}>Preço</th>
                  <th style={{ padding: "8px" }}>Raridade</th>
                  <th style={{ padding: "8px" }}>Vezes Aberta</th>
                  <th style={{ padding: "8px" }}>Receita</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lootBox => (
                  <tr key={lootBox.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={lootBox.image_url} alt={lootBox.name} style={{ width: "44px", height: "44px", objectFit: "cover", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 800 }}>{lootBox.name}</div>
                          <div style={{ color: "var(--muted)", fontSize: "11px", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {lootBox.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>R$ {formatNumber(lootBox.price)}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        display: "inline-block", border: `1px solid ${RARITY_COLORS[lootBox.rarity]}`, color: RARITY_COLORS[lootBox.rarity], background: "rgba(255,255,255,0.04)",
                        padding: "3px 8px", fontSize: "10px", fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap",
                      }}>
                        {RARITY_LABELS[lootBox.rarity]}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>{lootBox.times_opened}</td>
                    <td style={{ padding: "8px", color: "var(--green)", whiteSpace: "nowrap" }}>R$ {formatNumber(lootBox.total_revenue)}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        display: "inline-block", border: `1px solid ${lootBox.status === "active" ? "var(--green)" : "var(--muted)"}`, color: lootBox.status === "active" ? "var(--green)" : "var(--muted)", background: "rgba(255,255,255,0.04)",
                        padding: "3px 8px", fontSize: "10px", fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap",
                      }}>
                        {lootBox.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button type="button" onClick={() => toggleStatus(lootBox)} title={lootBox.status === "active" ? "Desativar" : "Ativar"} style={iconBtnStyle}>
                          {lootBox.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button type="button" onClick={() => openEditModal(lootBox)} title="Editar" style={iconBtnStyle}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => removeLootBox(lootBox)} title="Excluir" style={{ ...iconBtnStyle, borderColor: "var(--red)", color: "var(--red)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>Nenhuma loot box encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <form onSubmit={handleSubmit} className="marker-modal" style={{ maxWidth: "560px" }} onClick={e => e.stopPropagation()}>
            <p className="modal-kicker">{editingId ? "Editar loot box" : "Criar loot box"}</p>
            <h2 style={{ fontSize: "20px" }}>{editingId ? "Editar Loot Box" : "Nova Loot Box"}</h2>

            <div className="marker-form-grid">
              <label>
                <span>Nome da Loot Box</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Caixa de Iniciante"
                  required
                />
              </label>

              <label>
                <span>Preço (R$)</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                  min={0}
                  step="0.01"
                  required
                />
              </label>

              <label>
                <span>URL da Imagem</span>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://exemplo.com/imagem.jpg"
                  required
                />
              </label>

              <label>
                <span>Raridade</span>
                <select value={form.rarity} onChange={e => setForm(f => ({ ...f, rarity: e.target.value as Rarity }))}>
                  {(["common", "rare", "epic", "legendary"] as const).map(r => (
                    <option key={r} value={r}>{RARITY_LABELS[r]}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value === "inactive" ? "inactive" : "active" }))}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>

              <label>
                <span>Descrição</span>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Descreva o conteúdo da loot box..."
                  rows={3}
                  required
                />
              </label>

              <label>
                <span>Recompensas Possíveis (uma por linha)</span>
                <textarea
                  value={form.possible_rewards}
                  onChange={e => setForm(f => ({ ...f, possible_rewards: e.target.value }))}
                  placeholder={"Munição de Plasma\nKit Médico Básico\nE muito mais..."}
                  rows={4}
                  required
                />
              </label>
            </div>

            <div>
              <span style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "var(--muted)" }}>Taxas de Drop (%)</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(["common", "rare", "epic", "legendary"] as const).map(rarity => (
                  <div key={rarity} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "80px", fontSize: "12px", color: RARITY_COLORS[rarity] }}>{RARITY_LABELS[rarity]}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={form.drop_rates[rarity]}
                      onChange={e => handleDropRateChange(rarity, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.drop_rates[rarity]}
                      onChange={e => handleDropRateChange(rarity, e.target.value)}
                      style={{ ...inputStyle, width: "70px" }}
                    />
                    <span style={{ color: "var(--muted)", fontSize: "12px" }}>%</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid var(--line-soft)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Total:</span>
                  <strong style={{ fontSize: "12px", color: totalDropRate === 100 ? "var(--green)" : "var(--red)" }}>{totalDropRate}%</strong>
                </div>
              </div>
            </div>

            <div className="marker-form-meta">
              <span style={{ color: "var(--red)" }}>{formError}</span>
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

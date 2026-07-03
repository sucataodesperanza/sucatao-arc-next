"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronLeft, ChevronRight, Search, Star, X, TrendingUp, TrendingDown,
  Shield, User, Settings, Save, History, RefreshCw,
} from "lucide-react"
import { REPUTATION_LEVELS, getReputationLevel } from "@/lib/reputation"

// ─── tipos ────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string
  display_name: string | null
  username: string | null
  game_id: string | null
  avatar_url: string | null
  reputation: number
  points: number
  total_orders: number
  total_spent: number
  created_at: string
  is_admin: boolean
}

type RepEntry = {
  id: string
  amount: number
  reason: string
  source: string
  created_at: string
}

type RepSetting = { source: string; points: number; label: string }
type RepLevel  = { name: string; min_points: number; position: number; color: string }

// ─── estilos comuns ────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: 16,
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  padding: "7px 10px",
  color: "var(--paper)",
  fontSize: 13,
  width: "100%",
  font: "inherit",
}

const btnPrimary: React.CSSProperties = {
  background: "#f59e0b", color: "#000", border: "none",
  borderRadius: 6, padding: "7px 18px", fontWeight: 700, fontSize: 12, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
}

const btnSecondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", color: "var(--paper-dim)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
  padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6,
}

const SOURCE_LABEL: Record<string, string> = {
  trade: "Trade", contract: "Contrato",
  daily_streak: "Streak diário", admin: "Admin",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── componente ───────────────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  // lista
  const [users, setUsers]       = useState<AdminUser[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState("")
  const [loading, setLoading]   = useState(false)
  const searchTimeout           = useRef<ReturnType<typeof setTimeout> | null>(null)

  // drawer do usuário selecionado
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [repHistory, setRepHistory] = useState<RepEntry[]>([])
  const [histLoading, setHistLoading] = useState(false)

  // ajuste manual
  const [adjAmount, setAdjAmount] = useState("")
  const [adjReason, setAdjReason] = useState("")
  const [adjSaving, setAdjSaving] = useState(false)
  const [adjMsg, setAdjMsg]       = useState("")

  // configurações de ganho
  const [settings, setSettings]       = useState<RepSetting[]>([])
  const [editingSettings, setEditingSettings] = useState<Record<string, number>>({})
  const [settingsSaving, setSettingsSaving]   = useState<string | null>(null)
  const [settingsMsg, setSettingsMsg]         = useState("")

  // configurações de níveis
  const [levels, setLevels]           = useState<RepLevel[]>([])
  const [editingLevels, setEditingLevels] = useState<Record<string, number>>({})
  const [levelSaving, setLevelSaving]     = useState<string | null>(null)
  const [levelsMsg, setLevelsMsg]         = useState("")

  // ── carrega lista ────────────────────────────────────────────────────────

  const loadUsers = useCallback(async (q: string, p: number) => {
    setLoading(true)
    const params = new URLSearchParams({ q, page: String(p) })
    const res = await fetch(`/api/admin/usuarios?${params}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setUsers(d.users ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers(search, page) }, [page])  // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(q: string) {
    setSearch(q)
    setPage(1)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => loadUsers(q, 1), 350)
  }

  // ── carrega settings e níveis ────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/admin/reputation-settings")
      .then(r => r.json())
      .then(d => {
        setSettings(d.settings ?? [])
        const init: Record<string, number> = {}
        for (const s of (d.settings ?? [])) init[s.source] = s.points
        setEditingSettings(init)
      })
      .catch(() => {})

    fetch("/api/admin/reputation-levels")
      .then(r => r.json())
      .then(d => {
        setLevels(d.levels ?? [])
        const init: Record<string, number> = {}
        for (const l of (d.levels ?? [])) init[l.name] = l.min_points
        setEditingLevels(init)
      })
      .catch(() => {})
  }, [])

  async function saveLevel(name: string) {
    setLevelSaving(name)
    setLevelsMsg("")
    const res = await fetch("/api/admin/reputation-levels", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, min_points: editingLevels[name] ?? 0 }),
    })
    setLevelSaving(null)
    if (res.ok) {
      setLevels(prev => prev.map(l => l.name === name ? { ...l, min_points: editingLevels[name] ?? 0 } : l))
      setLevelsMsg("ok")
    } else {
      setLevelsMsg("error")
    }
    setTimeout(() => setLevelsMsg(""), 2500)
  }

  async function saveSetting(source: string) {
    setSettingsSaving(source)
    setSettingsMsg("")
    const res = await fetch("/api/admin/reputation-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, points: editingSettings[source] ?? 0 }),
    })
    setSettingsSaving(null)
    if (res.ok) {
      setSettings(prev => prev.map(s => s.source === source ? { ...s, points: editingSettings[source] ?? 0 } : s))
      setSettingsMsg("ok")
    } else {
      setSettingsMsg("error")
    }
    setTimeout(() => setSettingsMsg(""), 2500)
  }

  // ── abre drawer do usuário ────────────────────────────────────────────────

  async function openUser(u: AdminUser) {
    setSelected(u)
    setAdjAmount("")
    setAdjReason("")
    setAdjMsg("")
    setRepHistory([])
    setHistLoading(true)
    const res = await fetch(`/api/admin/usuarios/${u.id}/reputation-history`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setRepHistory(d.history ?? [])
    }
    setHistLoading(false)
  }

  // ── ajuste manual ─────────────────────────────────────────────────────────

  async function handleAdjust() {
    if (!selected) return
    const amount = Number(adjAmount)
    if (!adjAmount || isNaN(amount) || amount === 0) { setAdjMsg("Informe um valor diferente de zero."); return }
    if (!adjReason.trim()) { setAdjMsg("Informe o motivo."); return }

    setAdjSaving(true)
    setAdjMsg("")
    const res = await fetch(`/api/admin/reputation/${selected.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason: adjReason.trim() }),
    })
    setAdjSaving(false)

    if (res.ok) {
      // Atualiza usuário localmente
      const newRep = selected.reputation + amount
      setSelected({ ...selected, reputation: newRep })
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, reputation: newRep } : u))
      setRepHistory(prev => [{
        id: Math.random().toString(),
        amount,
        reason: adjReason.trim(),
        source: "admin",
        created_at: new Date().toISOString(),
      }, ...prev])
      setAdjAmount("")
      setAdjReason("")
      setAdjMsg("ok")
    } else {
      setAdjMsg("error")
    }
    setTimeout(() => setAdjMsg(""), 2500)
  }

  const totalPages = Math.max(1, Math.ceil(total / 30))
  const repLevel   = selected ? getReputationLevel(selected.reputation) : null

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 950, color: "var(--paper)", margin: "0 0 20px" }}>Controle de Usuários</h1>

      {/* ── Configurações de Reputação ────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Settings size={14} style={{ color: "#f59e0b" }} />
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#f59e0b" }}>
            Ganho de Reputação por Evento
          </span>
          {settingsMsg === "ok"    && <span style={{ marginLeft: "auto", fontSize: 11, color: "#22c55e" }}>✓ Salvo!</span>}
          {settingsMsg === "error" && <span style={{ marginLeft: "auto", fontSize: 11, color: "#ef4444" }}>✗ Erro ao salvar.</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {settings.map(s => (
            <div key={s.source} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                {s.label} ({SOURCE_LABEL[s.source] ?? s.source})
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  value={editingSettings[s.source] ?? s.points}
                  onChange={e => setEditingSettings(prev => ({ ...prev, [s.source]: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                />
                <button
                  type="button"
                  onClick={() => saveSetting(s.source)}
                  disabled={settingsSaving === s.source}
                  style={btnPrimary}
                >
                  <Save size={11} />
                  {settingsSaving === s.source ? "…" : "Salvar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Níveis de Reputação ──────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Star size={14} style={{ color: "#b477ff" }} />
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#b477ff" }}>
            Limiares dos Níveis
          </span>
          <span style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            (pontos mínimos para cada nível)
          </span>
          {levelsMsg === "ok"    && <span style={{ marginLeft: "auto", fontSize: 11, color: "#22c55e" }}>✓ Salvo!</span>}
          {levelsMsg === "error" && <span style={{ marginLeft: "auto", fontSize: 11, color: "#ef4444" }}>✗ Erro ao salvar.</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
          {levels.map(l => (
            <div key={l.name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: l.color, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block", flexShrink: 0 }} />
                {l.name}
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  min={0}
                  value={editingLevels[l.name] ?? l.min_points}
                  onChange={e => setEditingLevels(prev => ({ ...prev, [l.name]: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: 100, flexShrink: 0 }}
                />
                <button
                  type="button"
                  onClick={() => saveLevel(l.name)}
                  disabled={levelSaving === l.name}
                  style={{ ...btnPrimary, background: l.color }}
                >
                  <Save size={11} />
                  {levelSaving === l.name ? "…" : "Salvar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Listagem ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-500)", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Buscar por nome ou nick…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <button type="button" onClick={() => loadUsers(search, page)} style={btnSecondary}>
          <RefreshCw size={12} />
          Recarregar
        </button>
        <span style={{ fontSize: 12, color: "var(--gray-500)", marginLeft: "auto" }}>
          {total} usuário{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["Usuário", "Reputação", "Nível", "Pontos", "Pedidos", "Cadastro", ""].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: "30px 0", textAlign: "center", color: "var(--gray-500)" }}>Carregando…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: "30px 0", textAlign: "center", color: "var(--gray-500)" }}>Nenhum usuário encontrado.</td></tr>
            ) : users.map(u => {
              const lvl = getReputationLevel(u.reputation)
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  onClick={() => openUser(u)}
                >
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: `color-mix(in srgb, ${lvl.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${lvl.color} 30%, transparent)`, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, color: lvl.color, overflow: "hidden" }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (u.display_name ?? u.username ?? u.game_id ?? "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: "var(--paper)" }}>{u.display_name ?? u.username ?? u.game_id ?? "Sem nome"}</p>
                        {u.game_id && <p style={{ margin: 0, fontSize: 11, color: "var(--gray-500)" }}>{u.game_id}</p>}
                        {u.is_admin && <span style={{ fontSize: 9, fontWeight: 800, color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 3, padding: "1px 5px", textTransform: "uppercase" }}>Admin</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px", fontWeight: 800, color: lvl.color }}>{u.reputation.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: lvl.color }}>{lvl.name}</td>
                  <td style={{ padding: "10px 10px", color: "#ffd400" }}>{u.points.toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "10px 10px", color: "var(--gray-400)" }}>{u.total_orders}</td>
                  <td style={{ padding: "10px 10px", color: "var(--gray-500)", fontSize: 12 }}>{formatDate(u.created_at)}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <button type="button" onClick={e => { e.stopPropagation(); openUser(u) }} style={btnSecondary}>
                      <Star size={11} />
                      Rep
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, justifyContent: "center" }}>
          <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={btnSecondary}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: 13, color: "var(--gray-400)" }}>Página {page} de {totalPages}</span>
          <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btnSecondary}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* ── Drawer do usuário ─────────────────────────────────────────────── */}
      {selected && (
        <>
          {/* overlay */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setSelected(null)}
          />
          {/* painel */}
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50, width: 420, maxWidth: "100vw", background: "#07111a", borderLeft: "1px solid rgba(255,255,255,0.1)", overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* cabeçalho */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: repLevel ? `color-mix(in srgb, ${repLevel.color} 15%, transparent)` : "rgba(255,255,255,0.07)", border: `1.5px solid ${repLevel?.color ?? "rgba(255,255,255,0.1)"}`, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 16, fontWeight: 800, color: repLevel?.color, overflow: "hidden" }}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <User size={18} style={{ color: repLevel?.color }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 950, fontSize: 16, color: "var(--paper)" }}>{selected.display_name ?? selected.username ?? selected.game_id ?? "Sem nome"}</p>
                {selected.game_id && <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--gray-500)" }}>{selected.game_id}</p>}
                <p style={{ margin: "4px 0 0", fontSize: 12, color: repLevel?.color, fontWeight: 700 }}>{repLevel?.name} · {selected.reputation.toLocaleString("pt-BR")} pts</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ ...btnSecondary, padding: 6 }}>
                <X size={14} />
              </button>
            </div>

            {/* stats rápidas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Pontos", value: selected.points.toLocaleString("pt-BR"), color: "#ffd400" },
                { label: "Pedidos", value: String(selected.total_orders), color: "var(--paper)" },
                { label: "Total gasto", value: `R$ ${Number(selected.total_spent).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#22c55e" },
                { label: "Membro desde", value: formatDate(selected.created_at), color: "var(--gray-400)" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--gray-500)" }}>{stat.label}</p>
                  <p style={{ margin: "4px 0 0", fontWeight: 800, fontSize: 14, color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* barra de progresso de rep */}
            {(() => {
              const THRESHOLDS = REPUTATION_LEVELS.map(l => l.min)
              const idx     = [...THRESHOLDS].reverse().findIndex(m => selected.reputation >= m)
              const curMin  = THRESHOLDS[THRESHOLDS.length - 1 - idx] ?? 0
              const nextMin = THRESHOLDS[THRESHOLDS.length - idx]
              const pct = nextMin
                ? Math.min(100, Math.round(((selected.reputation - curMin) / (nextMin - curMin)) * 100))
                : 100
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--gray-500)", marginBottom: 6 }}>
                    <span>{repLevel?.name}</span>
                    {nextMin && <span>{(nextMin - selected.reputation).toLocaleString("pt-BR")} pts para próximo nível</span>}
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: repLevel?.color ?? "#f59e0b", borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                </div>
              )
            })()}

            {/* ajuste manual */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 16 }}>
              <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Ajuste manual de reputação
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)" }}>
                  Quantidade (use negativo para remover)
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" onClick={() => setAdjAmount(v => v.startsWith("-") ? v.slice(1) : (v ? `-${v}` : "-"))} style={{ ...btnSecondary, padding: "7px 10px", flexShrink: 0 }}>
                    {adjAmount.startsWith("-") ? <TrendingDown size={13} style={{ color: "#ef4444" }} /> : <TrendingUp size={13} style={{ color: "#22c55e" }} />}
                  </button>
                  <input
                    type="number"
                    placeholder="Ex: 200"
                    value={adjAmount}
                    onChange={e => setAdjAmount(e.target.value)}
                    style={{ ...inputStyle }}
                  />
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", marginTop: 4 }}>Motivo</label>
                <input
                  type="text"
                  placeholder="Ex: Bônus de evento especial"
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  style={{ ...inputStyle }}
                  onKeyDown={e => e.key === "Enter" && handleAdjust()}
                />
                {adjMsg === "ok"    && <p style={{ margin: 0, fontSize: 12, color: "#22c55e" }}>✓ Reputação ajustada!</p>}
                {adjMsg === "error" && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>✗ Erro ao ajustar.</p>}
                {adjMsg !== "ok" && adjMsg !== "error" && adjMsg && <p style={{ margin: 0, fontSize: 12, color: "#f59e0b" }}>{adjMsg}</p>}
                <button type="button" onClick={handleAdjust} disabled={adjSaving} style={{ ...btnPrimary, alignSelf: "flex-start", marginTop: 4 }}>
                  <Shield size={12} />
                  {adjSaving ? "Salvando…" : "Aplicar ajuste"}
                </button>
              </div>
            </div>

            {/* histórico */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <History size={13} style={{ color: "var(--gray-400)" }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Histórico</span>
              </div>
              {histLoading ? (
                <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Carregando…</p>
              ) : repHistory.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--gray-500)" }}>Nenhuma movimentação ainda.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {repHistory.map(entry => (
                    <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.reason}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>
                          {SOURCE_LABEL[entry.source] ?? entry.source} · {formatDate(entry.created_at)}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 950, flexShrink: 0, color: entry.amount >= 0 ? "#22c55e" : "#ef4444" }}>
                        {entry.amount >= 0 ? "+" : ""}{entry.amount.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

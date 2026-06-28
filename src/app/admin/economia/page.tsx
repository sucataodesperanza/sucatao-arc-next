"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, TrendingUp, Database, Users } from "lucide-react"
import { useToast } from "@/components/admin-notifications"

type VeiItem = { item_id: string; vei: number; trade_count: number; weekly_demand: number; liquidity_score: number; last_calculated_at: string; catalog_items: { name: string; rarity: string | null; item_type: string | null } | null }
type EcoLog  = { id: string; player_id: string; action: string; value: number; currency: string; source: string; created_at: string; profiles: { name: string | null } | null }

export default function AdminEconomiaPage() {
  const toast = useToast()
  const [topVei, setTopVei]             = useState<VeiItem[]>([])
  const [recentLogs, setRecentLogs]     = useState<EcoLog[]>([])
  const [stats, setStats]               = useState<{ total_logs: number; total_players: number; total_value: number } | null>(null)
  const [loading, setLoading]           = useState(true)
  const [syncing, setSyncing]           = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { createClient } = await import("@/lib/supabase/client")
    const db = createClient()

    const [veiRes, logsRes, statsRes] = await Promise.all([
      db.from("item_economics").select("item_id,vei,trade_count,weekly_demand,liquidity_score,last_calculated_at,catalog_items(name,rarity,item_type)").order("vei", { ascending: false }).limit(20),
      db.from("economy_logs").select("id,player_id,action,value,currency,source,created_at,profiles(name)").order("created_at", { ascending: false }).limit(30),
      db.from("economy_logs").select("player_id,value").then(r => ({
        data: {
          total_logs:    r.data?.length ?? 0,
          total_players: new Set(r.data?.map(l => l.player_id)).size,
          total_value:   r.data?.reduce((s, l) => s + Number(l.value), 0) ?? 0,
        }
      })),
    ])

    setTopVei((veiRes.data ?? []) as unknown as VeiItem[])
    setRecentLogs((logsRes.data ?? []) as unknown as EcoLog[])
    setStats(statsRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function syncAction(endpoint: string, label: string) {
    setSyncing(endpoint)
    const res = await fetch(endpoint, { method: "POST" })
    setSyncing(null)
    if (res.ok) {
      const body = await res.json()
      toast.success(`${label}: ${body.synced ?? body.updated ?? 0} registros.`)
      await load()
    } else {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? `Erro em ${label}`)
    }
  }

  const ACTION_COLOR: Record<string, string> = { buy: "var(--red)", sell: "var(--green)", reward: "var(--yellow)", earn: "var(--green)", spend: "var(--red)", trade: "var(--cyan)" }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--cyan)", opacity: 0.7 }}>Painel Administrativo</p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 950, textTransform: "uppercase" }}>ECONOMIA</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { icon: Database,   label: "Total de Logs",    value: stats.total_logs.toLocaleString("pt-BR"),                 color: "var(--cyan)"   },
            { icon: Users,      label: "Jogadores ativos", value: stats.total_players.toLocaleString("pt-BR"),              color: "var(--green)"  },
            { icon: TrendingUp, label: "Volume total pts", value: stats.total_value.toLocaleString("pt-BR") + " pts",       color: "var(--yellow)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="utility-panel" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${color} 12%, transparent)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)" }}>{label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 18, fontWeight: 950, color }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ações de Sync */}
      <div className="utility-panel" style={{ marginBottom: 16 }}>
        <div className="utility-panel-head"><strong>Sincronização MetaForge</strong><small>Importar dados de traders, quests e recalcular VEI</small></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { endpoint: "/api/admin/economia/sync-traders", label: "Sync Traders" },
            { endpoint: "/api/admin/economia/sync-quests",  label: "Sync Quests"  },
            { endpoint: "/api/admin/economia/recalc-vei",   label: "Recalcular VEI" },
            { endpoint: "/api/admin/catalog/sync",          label: "Sync Itens (MetaForge)" },
          ].map(({ endpoint, label }) => (
            <button key={endpoint} type="button" disabled={syncing === endpoint}
              onClick={() => syncAction(endpoint, label)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--stroke)", background: "rgba(255,255,255,0.04)", color: "var(--paper)", padding: "8px 14px", fontSize: 12, fontWeight: 950, cursor: "pointer", borderRadius: 6, font: "inherit", opacity: syncing === endpoint ? 0.6 : 1, textTransform: "uppercase" }}>
              <RefreshCw size={12} className={syncing === endpoint ? "animate-spin" : ""} />
              {syncing === endpoint ? "Aguarde..." : label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top VEI */}
        <div className="utility-panel">
          <div className="utility-panel-head"><strong>Top 20 — VEI</strong><small>Itens com maior Valor Econômico</small></div>
          {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--stroke)" }}>
                  {["Item", "Raridade", "VEI", "Trades", "Demanda/sem", "Liquidez"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: "var(--gray-500)", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topVei.map(row => (
                  <tr key={row.item_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 800, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.catalog_items?.name ?? row.item_id}</td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)", fontSize: 11 }}>{row.catalog_items?.rarity ?? "—"}</td>
                    <td style={{ padding: "6px 8px" }}><strong style={{ color: row.vei >= 70 ? "var(--yellow)" : row.vei >= 40 ? "var(--cyan)" : "var(--paper)" }}>{row.vei.toFixed(1)}</strong></td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{row.trade_count}</td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{row.weekly_demand}</td>
                    <td style={{ padding: "6px 8px", color: "var(--muted)" }}>{row.liquidity_score.toFixed(1)}</td>
                  </tr>
                ))}
                {topVei.length === 0 && <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "var(--muted)" }}>Nenhum dado. Clique em "Recalcular VEI".</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {/* Logs recentes */}
        <div className="utility-panel">
          <div className="utility-panel-head"><strong>Logs Econômicos Recentes</strong><small>Últimas 30 movimentações</small></div>
          {loading ? <p style={{ color: "var(--muted)", fontSize: 13 }}>Carregando...</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 480, overflowY: "auto" }}>
              {recentLogs.map(log => (
                <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
                  <span style={{ width: 60, fontSize: 10, fontWeight: 950, textTransform: "uppercase", color: ACTION_COLOR[log.action] ?? "var(--muted)", flexShrink: 0 }}>{log.action}</span>
                  <span style={{ flex: 1, color: "var(--paper-dim)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(log.profiles as any)?.name ?? log.player_id.slice(0, 8)}</span>
                  <span style={{ fontSize: 10, color: "var(--gray-500)", flexShrink: 0 }}>{log.source}</span>
                  <span style={{ fontWeight: 950, color: log.action === "buy" || log.action === "spend" ? "var(--red)" : "var(--green)", flexShrink: 0 }}>
                    {log.action === "buy" || log.action === "spend" ? "-" : "+"}{Number(log.value).toLocaleString("pt-BR")} {log.currency === "cash" ? "R$" : "pts"}
                  </span>
                </div>
              ))}
              {recentLogs.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 16 }}>Nenhum log registrado ainda.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

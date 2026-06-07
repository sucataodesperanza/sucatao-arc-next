"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import arcData from "@/data/arc-data"

type Item = { id: string; name: string; type?: string; value?: number }
const rawPerfilData = arcData as unknown as { items: Item[]; bots: unknown[]; maps: Array<{ status?: string }>; trades: { value: unknown[]; Count: number } }
const data = {
  items: rawPerfilData.items,
  bots: rawPerfilData.bots,
  maps: rawPerfilData.maps,
  trades: Array.isArray(rawPerfilData.trades) ? rawPerfilData.trades : (rawPerfilData.trades?.value ?? []),
}

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const displayName = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Visitante"
  const initial = displayName[0]?.toUpperCase() ?? "S"
  const readyMaps = data.maps.filter(m => m.status === "ready").length

  return (
    <section className="utility-page">
      <h2>Perfil</h2>
      <p>Conta com saldo, pontos, progresso diário e leitura rápida do usuário.</p>

      <section className="profile-layout">
        <section className="profile-panel profile-identity">
          <div className="utility-panel-head">
            <strong>Identidade</strong>
            <small>{loading ? "Carregando..." : user ? "Conectado" : "Visitante"}</small>
          </div>
          <div className="profile-hero">
            <div className="profile-avatar" id="profileAvatar">{initial}</div>
            <div>
              <h3>{displayName}</h3>
              <p>{user?.email ?? "Entre para salvar progresso por usuário no navegador."}</p>
            </div>
          </div>
          <div className="profile-action-row">
            {user ? (
              <button type="button" onClick={handleLogout}>Sair da conta</button>
            ) : (
              <button type="button" onClick={() => router.push("/login")}>Entrar / criar conta</button>
            )}
          </div>
        </section>

        <section className="profile-panel">
          <div className="utility-panel-head">
            <strong>Carteira</strong>
            <small>Valores atuais</small>
          </div>
          <div className="wallet-overview">
            <article>
              <span>Carteira real</span>
              <strong>0</strong>
              <p>Saldo reaproveitado para compra direta de itens no marketplace.</p>
            </article>
            <article>
              <span>Pontos do site</span>
              <strong>0</strong>
              <p>Inclui pontos base da conta e bônus das tarefas diárias concluídas.</p>
            </article>
            <article>
              <span>Resgates possíveis</span>
              <strong>0</strong>
              <p>Quantidade estimada de itens que o jogador já pode trocar.</p>
            </article>
          </div>
        </section>

        <section className="profile-panel">
          <div className="utility-panel-head">
            <strong>Progresso diário</strong>
            <small>Reset diário</small>
          </div>
          <div className="reward-strip">
            <article><span>Concluídas</span><strong>0/0</strong></article>
            <article><span>Pontos do dia</span><strong>0</strong></article>
            <article><span>Bônus</span><strong>N/D</strong></article>
          </div>
        </section>

        <section className="profile-panel">
          <div className="utility-panel-head">
            <strong>Resumo da conta</strong>
            <small>Leitura rápida</small>
          </div>
          <div className="profile-summary-grid">
            <article><span>Favoritos</span><strong>0</strong></article>
            <article><span>Itens no catálogo</span><strong>{formatNumber(data.items.length)}</strong></article>
            <article><span>Trades ativos</span><strong>{formatNumber(Array.isArray(data.trades) ? data.trades.length : 0)}</strong></article>
            <article><span>Mapas prontos</span><strong>{readyMaps}</strong></article>
          </div>
        </section>

        <section className="profile-panel">
          <div className="utility-panel-head">
            <strong>Histórico</strong>
            <small>0 eventos</small>
          </div>
          <div className="profile-history-list">
            <p style={{ color: "var(--muted)", fontSize: "13px" }}>Nenhum evento registrado.</p>
          </div>
        </section>
      </section>
    </section>
  )
}


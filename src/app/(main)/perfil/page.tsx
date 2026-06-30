"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Package, ShoppingBag, TrendingUp } from "lucide-react"
import type { Area } from "react-easy-crop"
import { createClient } from "@/lib/supabase/client"
import { getCroppedImageBlob } from "@/lib/crop-image"
import { AvatarCropModal } from "@/components/avatar-crop-modal"
import { isValidCpf } from "@/lib/cpf"
import "../../../styles/perfil.css"

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]

type Order = { id: string; created_at: string; status: string; payment_status: string | null; total: number; payment_method: string | null; items: { name: string; qty?: number }[]; delivered_at: string | null }
type EcoLog = { id: string; action: string; value: number; currency: string; source: string; created_at: string }

function formatNumber(n: number | undefined) { return (n ?? 0).toLocaleString("pt-BR") }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) }
function formatDateShort(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) }

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const [cropImage, setCropImage] = useState<{ src: string; type: string } | null>(null)
  const [gameId, setGameId]         = useState("")
  const [gameIdSaving, setGameIdSaving] = useState(false)
  const [gameIdMsg, setGameIdMsg]   = useState("")
  const [cpf, setCpf]               = useState("")
  const [cpfSaving, setCpfSaving]   = useState(false)
  const [cpfMsg, setCpfMsg]         = useState("")
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [totalSpent, setTotalSpent]   = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [inventoryCount, setInventoryCount] = useState(0)
  const [orders, setOrders]           = useState<Order[]>([])
  const [ecoLogs, setEcoLogs]         = useState<EcoLog[]>([])
  const [discordId, setDiscordId]           = useState<string | null>(null)
  const [discordUsername, setDiscordUsername] = useState<string | null>(null)
  const [discordAvatar, setDiscordAvatar]     = useState<string | null>(null)
  const [discordDisconnecting, setDiscordDisconnecting] = useState(false)
  const [discordMsg, setDiscordMsg]           = useState("")
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null)
  const [deliveryMsg, setDeliveryMsg]         = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      if (!user) return

      const [profileRes, inventoryRes, ordersRes, ecoRes] = await Promise.all([
        supabase.from("profiles").select("points, avatar_url, game_id, cpf, total_spent, total_orders, created_at, discord_id, discord_username, discord_avatar").eq("id", user.id).single(),
        supabase.from("user_inventory").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("orders").select("id, created_at, status, payment_status, total, payment_method, items, delivered_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("economy_logs").select("id, action, value, currency, source, created_at").eq("player_id", user.id).order("created_at", { ascending: false }).limit(20),
      ])

      if (profileRes.data) {
        setPoints(profileRes.data.points ?? 0)
        setAvatarUrl(profileRes.data.avatar_url ?? null)
        setGameId(profileRes.data.game_id ?? "")
        setCpf(profileRes.data.cpf ?? "")
        setTotalSpent(Number(profileRes.data.total_spent ?? 0))
        setTotalOrders(profileRes.data.total_orders ?? 0)
        setMemberSince(profileRes.data.created_at ?? null)
        setDiscordId(profileRes.data.discord_id ?? null)
        setDiscordUsername(profileRes.data.discord_username ?? null)
        setDiscordAvatar(profileRes.data.discord_avatar ?? null)
      }

      // Toast baseado no retorno do OAuth Discord — lido via window para evitar Suspense
      const params = new URLSearchParams(window.location.search)
      const discordParam = params.get("discord")
      if (discordParam === "connected")  setDiscordMsg("connected")
      if (discordParam === "error")      setDiscordMsg("error")
      if (discordParam === "cancelled")  setDiscordMsg("cancelled")
      if (discordParam) {
        const clean = new URL(window.location.href)
        clean.searchParams.delete("discord")
        window.history.replaceState({}, "", clean.toString())
      }
      setInventoryCount(inventoryRes.count ?? 0)
      setOrders((ordersRes.data ?? []) as unknown as Order[])
      setEcoLogs((ecoRes.data ?? []) as unknown as EcoLog[])
    })
  }, [])

  function formatCpf(value: string) {
    return value.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  }

  async function saveCpf() {
    if (!user) return
    const raw = cpf.replace(/\D/g, "")
    if (raw && !isValidCpf(raw)) {
      setCpfMsg("CPF inválido.")
      setTimeout(() => setCpfMsg(""), 3500)
      return
    }
    setCpfSaving(true)
    setCpfMsg("")
    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ cpf: raw || null }).eq("id", user.id)
    setCpfSaving(false)
    setCpfMsg(error ? "error" : "ok")
    setTimeout(() => setCpfMsg(""), 3500)
  }

  async function saveGameId() {
    if (!user) return
    const original = gameId
    setGameIdSaving(true)
    setGameIdMsg("")
    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ game_id: gameId.trim() || null }).eq("id", user.id)
    setGameIdSaving(false)
    if (!error) {
      setGameIdMsg("ok")
      setTimeout(() => setGameIdMsg(""), 3500)
    } else {
      setGameIdMsg("error")
      setTimeout(() => setGameIdMsg(""), 3500)
      setGameId(original) // reverte se falhou
    }
  }

  async function handleDiscordDisconnect() {
    setDiscordDisconnecting(true)
    const res = await fetch("/api/auth/discord/disconnect", { method: "POST" })
    setDiscordDisconnecting(false)
    if (res.ok) {
      setDiscordId(null)
      setDiscordUsername(null)
      setDiscordAvatar(null)
      setDiscordMsg("disconnected")
    } else {
      setDiscordMsg("error")
    }
    setTimeout(() => setDiscordMsg(""), 4000)
  }

  async function handleConfirmDelivery(orderId: string) {
    setConfirmingDeliveryId(orderId)
    const res = await fetch(`/api/store/orders/${orderId}/confirm-delivery`, { method: "POST" })
    setConfirmingDeliveryId(null)
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivered_at: new Date().toISOString() } : o))
      setDeliveryMsg("ok")
    } else {
      setDeliveryMsg("error")
    }
    setTimeout(() => setDeliveryMsg(""), 3500)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !user) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Formato inválido. Envie uma imagem JPG, PNG ou WEBP.")
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("A imagem deve ter até 2MB.")
      return
    }

    setAvatarError("")

    const reader = new FileReader()
    reader.onload = () => setCropImage({ src: reader.result as string, type: file.type })
    reader.readAsDataURL(file)
  }

  async function handleCropConfirm(area: Area) {
    if (!user || !cropImage) return

    setAvatarUploading(true)
    setAvatarError("")

    try {
      const blob = await getCroppedImageBlob(cropImage.src, area, cropImage.type)
      const supabase = createClient()
      const ext = cropImage.type === "image/png" ? "png" : cropImage.type === "image/webp" ? "webp" : "jpg"
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        upsert: true,
        contentType: cropImage.type,
      })

      if (uploadError) {
        setAvatarError("Não foi possível enviar a imagem. Tente novamente.")
        return
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id)

      if (updateError) {
        setAvatarError("Não foi possível salvar a foto no perfil.")
        return
      }

      setAvatarUrl(publicUrl)
      setCropImage(null)
      router.refresh()
    } catch {
      setAvatarError("Não foi possível processar a imagem.")
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleCropCancel() {
    setCropImage(null)
  }

  async function handleRemoveAvatar() {
    if (!user) return
    setAvatarError("")
    setAvatarUploading(true)

    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id)

    setAvatarUploading(false)

    if (error) {
      setAvatarError("Não foi possível remover a foto.")
      return
    }

    setAvatarUrl(null)
    router.refresh()
  }

  const displayName = user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "Visitante"
  const initial = displayName[0]?.toUpperCase() ?? "S"

  const ACTION_LABEL: Record<string, string> = { buy: "Compra", sell: "Venda", reward: "Recompensa", earn: "Ganho", spend: "Gasto", trade: "Trade" }
  const ACTION_COLOR: Record<string, string> = { buy: "var(--red)", sell: "var(--green)", reward: "var(--yellow)", earn: "var(--green)", spend: "var(--red)", trade: "var(--cyan)" }
  const SOURCE_LABEL: Record<string, string> = { shop: "Loja", trade: "Trade", contract: "Contrato", auction: "Leilão", reward: "Recompensa", admin: "Admin" }

  return (
    <>
    <div className="profile-page-bg">
    <div className="profile-page">
      <h1 className="page-title">Perfil</h1>

      {cropImage && (
        <AvatarCropModal
          imageSrc={cropImage.src}
          loading={avatarUploading}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      <section aria-label="Identidade">
        <p className="home-section-label">Identidade</p>
        <div className="profile-card profile-identity-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initial}
            </div>
            {user && (
              <label className="profile-avatar-edit" data-tooltip="Trocar foto">
                <Camera size={13} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={avatarUploading}
                />
              </label>
            )}
          </div>
          <div className="profile-identity-info">
            <h2>
              {displayName}
              <span className={`profile-status-badge${user ? " online" : ""}`}>
                {loading ? "Carregando..." : user ? "Conectado" : "Visitante"}
              </span>
            </h2>
            <p>{user?.email ?? "Entre para salvar seu progresso na conta."}</p>

            {user && (
              <>
              <div className="profile-game-id">
                <label htmlFor="game-id-input" className="profile-game-id-label">
                  Nick no ARC Raiders
                </label>
                <div className="profile-game-id-row">
                  <input
                    id="game-id-input"
                    type="text"
                    className={`profile-game-id-input${gameIdSaving ? " saving" : ""}`}
                    placeholder="Ex: AndreGamer ou MeuNick#1234"
                    value={gameId}
                    onChange={e => setGameId(e.target.value)}
                    onBlur={saveGameId}
                    onKeyDown={e => e.key === "Enter" && (e.currentTarget.blur())}
                    maxLength={60}
                    disabled={gameIdSaving}
                  />
                  {gameIdSaving && <span className="profile-game-id-status saving">Salvando...</span>}
                </div>
                <p className="profile-game-id-hint">
                  Necessário para receber itens comprados na loja.
                </p>
              </div>

              {/* CPF */}
              <div className="profile-game-id" style={{ marginTop: 12 }}>
                <label htmlFor="cpf-input" className="profile-game-id-label">
                  CPF <span style={{ color: "var(--gray-500)", fontWeight: 800, textTransform: "none", letterSpacing: 0 }}>(para pagamentos via PIX)</span>
                </label>
                <div className="profile-game-id-row">
                  <input
                    id="cpf-input"
                    type="text"
                    inputMode="numeric"
                    className={`profile-game-id-input${cpfSaving ? " saving" : ""}`}
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={e => setCpf(formatCpf(e.target.value))}
                    onBlur={saveCpf}
                    onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()}
                    maxLength={14}
                    disabled={cpfSaving}
                  />
                  {cpfSaving && <span className="profile-game-id-status saving">Salvando...</span>}
                  {cpfMsg === "invalid" && <span className="profile-game-id-status error">CPF inválido.</span>}
                </div>
                <p className="profile-game-id-hint">Armazenado com segurança. Não compartilhamos seus dados.</p>
              </div>
              </>
            )}

            {user && avatarUrl && (
              <button type="button" className="profile-remove-avatar" onClick={handleRemoveAvatar} disabled={avatarUploading}>
                Remover foto
              </button>
            )}
            {avatarError && <p className="profile-avatar-error">{avatarError}</p>}
          </div>
          {user ? (
            <button type="button" className="profile-action-btn" onClick={handleLogout}>Sair da conta</button>
          ) : (
            <button type="button" className="profile-action-btn profile-action-btn-primary" onClick={() => router.push("/login")}>Entrar / criar conta</button>
          )}
        </div>
      </section>

      {/* Estatísticas */}
      <section aria-label="Estatísticas">
        <p className="home-section-label">Estatísticas</p>
        <div className="profile-stat-grid">
          <article className="profile-stat-card">
            <span>Pontos disponíveis</span>
            <strong>{formatNumber(points)}</strong>
            <p>Saldo atual para trocar na loja.</p>
          </article>
          <article className="profile-stat-card">
            <span>Itens no inventário</span>
            <strong>{formatNumber(inventoryCount)}</strong>
            <p>Total de itens que você possui.</p>
          </article>
          <article className="profile-stat-card">
            <span>Total de pedidos</span>
            <strong>{formatNumber(totalOrders)}</strong>
            <p>Compras realizadas na loja.</p>
          </article>
          <article className="profile-stat-card">
            <span>Total gasto (R$)</span>
            <strong>R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
            <p>Valor acumulado em compras via PIX.</p>
          </article>
          {memberSince && (
            <article className="profile-stat-card">
              <span>Membro desde</span>
              <strong>{formatDate(memberSince)}</strong>
              <p>Data em que você se cadastrou no Sucatão.</p>
            </article>
          )}
        </div>
      </section>

      {/* Discord */}
      {user && (
        <section aria-label="Discord">
          <p className="home-section-label">Discord</p>
          <div className="profile-card profile-discord-card">
            <div className="profile-discord-icon">
              <svg width="22" height="16" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 1.492a19.825 19.825 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.442a.061.061 0 0 0-.031-.03zM8.02 12.278c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="currentColor"/>
              </svg>
            </div>

            {discordId ? (
              <div className="profile-discord-connected">
                <div className="profile-discord-user">
                  {discordAvatar
                    ? <img src={discordAvatar} alt={discordUsername ?? "Discord"} className="profile-discord-avatar" />
                    : <div className="profile-discord-avatar profile-discord-avatar-placeholder">#</div>
                  }
                  <div>
                    <p className="profile-discord-username">{discordUsername}</p>
                    <p className="profile-discord-status">Conta conectada</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-discord-btn profile-discord-btn-disconnect"
                  onClick={handleDiscordDisconnect}
                  disabled={discordDisconnecting}
                >
                  {discordDisconnecting ? "Desconectando..." : "Desconectar"}
                </button>
              </div>
            ) : (
              <div className="profile-discord-disconnected">
                <div>
                  <p className="profile-discord-label">Conta Discord não vinculada</p>
                  <p className="profile-discord-hint">Vincule para receber notificações de pedidos e entregas direto no seu Discord.</p>
                </div>
                <a href="/api/auth/discord" className="profile-discord-btn profile-discord-btn-connect">
                  Conectar Discord
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Histórico de pedidos */}
      <section aria-label="Histórico de pedidos">
        <p className="home-section-label">Últimos Pedidos</p>
        <div className="profile-card">
          {orders.length === 0 ? (
            <p className="profile-empty">Nenhum pedido realizado ainda.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {orders.map(order => {
                const statusColor: Record<string, string> = { paid: "var(--green)", pending: "var(--yellow)", cancelled: "var(--red)", failed: "var(--red)" }
                const statusLabel: Record<string, string> = { paid: "Pago", pending: "Pendente", cancelled: "Cancelado", failed: "Falhou" }
                const itemNames = Array.isArray(order.items) ? order.items.map((i: any) => i.name ?? i.itemId ?? "Item").slice(0, 3).join(", ") : "—"
                const awaitingDelivery = order.payment_method === "loja_oficial" && order.payment_status === "paid" && !order.delivered_at
                return (
                  <div key={order.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <ShoppingBag size={14} style={{ color: "var(--cyan)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{itemNames}{Array.isArray(order.items) && order.items.length > 3 ? ` +${order.items.length - 3}` : ""}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>{formatDate(order.created_at)} · {order.payment_method === "pontos" ? "Pontos" : "PIX"}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontWeight: 950, color: order.payment_method === "pontos" ? "var(--yellow)" : "var(--green)" }}>
                          {order.payment_method === "pontos" ? `${formatNumber(order.total)} pts` : `R$ ${Number(order.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 950, color: statusColor[order.status] ?? "var(--muted)" }}>{statusLabel[order.status] ?? order.status}</p>
                      </div>
                    </div>
                    {awaitingDelivery && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="profile-discord-btn profile-discord-btn-connect"
                          onClick={() => handleConfirmDelivery(order.id)}
                          disabled={confirmingDeliveryId === order.id}
                        >
                          {confirmingDeliveryId === order.id ? "Confirmando..." : "Confirmar recebimento"}
                        </button>
                      </div>
                    )}
                    {order.delivered_at && (
                      <p style={{ margin: 0, fontSize: 11, color: "var(--green)", textAlign: "right" }}>✓ Entrega confirmada</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Movimentações de pontos */}
      <section aria-label="Movimentações de pontos">
        <p className="home-section-label">Movimentações de Pontos</p>
        <div className="profile-card">
          {ecoLogs.length === 0 ? (
            <p className="profile-empty">Nenhuma movimentação registrada.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {ecoLogs.map(log => {
                const isPositive = ["reward", "earn", "sell"].includes(log.action)
                return (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb, ${ACTION_COLOR[log.action] ?? "var(--gray-500)"} 12%, transparent)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <TrendingUp size={14} style={{ color: ACTION_COLOR[log.action] ?? "var(--gray-500)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800 }}>{ACTION_LABEL[log.action] ?? log.action}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--gray-500)" }}>{SOURCE_LABEL[log.source] ?? log.source} · {formatDateShort(log.created_at)}</p>
                    </div>
                    <p style={{ margin: 0, fontWeight: 950, color: isPositive ? "var(--green)" : "var(--red)", flexShrink: 0 }}>
                      {isPositive ? "+" : "-"}{formatNumber(Math.abs(Number(log.value)))} {log.currency === "cash" ? "R$" : "pts"}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
    </div>

    {/* Toasts */}
    {gameIdMsg && (
      <div className="app-toast" data-tone={gameIdMsg === "ok" ? "success" : "error"} role="status" aria-live="polite">
        {gameIdMsg === "ok" ? "✓ Nick salvo com sucesso!" : "✗ Erro ao salvar o nick."}
      </div>
    )}
    {(cpfMsg === "ok" || cpfMsg === "error") && (
      <div className="app-toast" data-tone={cpfMsg === "ok" ? "success" : "error"} role="status" aria-live="polite">
        {cpfMsg === "ok" ? "✓ CPF salvo com sucesso!" : "✗ Erro ao salvar o CPF."}
      </div>
    )}
    {discordMsg === "connected" && (
      <div className="app-toast" data-tone="success" role="status" aria-live="polite">✓ Discord conectado com sucesso!</div>
    )}
    {discordMsg === "disconnected" && (
      <div className="app-toast" data-tone="success" role="status" aria-live="polite">✓ Discord desconectado.</div>
    )}
    {discordMsg === "error" && (
      <div className="app-toast" data-tone="error" role="status" aria-live="polite">✗ Erro ao conectar o Discord. Tente novamente.</div>
    )}
    {deliveryMsg === "ok" && (
      <div className="app-toast" data-tone="success" role="status" aria-live="polite">✓ Entrega confirmada! Obrigado.</div>
    )}
    {deliveryMsg === "error" && (
      <div className="app-toast" data-tone="error" role="status" aria-live="polite">✗ Não foi possível confirmar a entrega. Tente novamente.</div>
    )}
    </>
  )
}


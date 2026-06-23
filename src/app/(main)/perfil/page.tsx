"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"
import type { Area } from "react-easy-crop"
import { createClient } from "@/lib/supabase/client"
import { getCroppedImageBlob } from "@/lib/crop-image"
import { AvatarCropModal } from "@/components/avatar-crop-modal"
import arcData from "@/data/arc-data"
import "../../../styles/perfil.css"

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]

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
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState("")
  const [cropImage, setCropImage] = useState<{ src: string; type: string } | null>(null)
  const [gameId, setGameId] = useState("")
  const [gameIdSaving, setGameIdSaving] = useState(false)
  const [gameIdMsg, setGameIdMsg] = useState("")

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
      if (!user) return
      supabase.from("profiles").select("points, avatar_url, game_id").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setPoints(data.points ?? 0)
          setAvatarUrl(data.avatar_url ?? null)
          setGameId(data.game_id ?? "")
        }
      })
    })
  }, [])

  async function saveGameId() {
    if (!user) return
    setGameIdSaving(true)
    setGameIdMsg("")
    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ game_id: gameId.trim() || null }).eq("id", user.id)
    setGameIdSaving(false)
    setGameIdMsg(error ? "Erro ao salvar." : "Salvo!")
    setTimeout(() => setGameIdMsg(""), 3000)
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
  const readyMaps = data.maps.filter(m => m.status === "ready").length
  const redeemableCount = data.items.filter(i => (i.value ?? 0) * 24 <= points).length

  return (
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
              <div className="profile-game-id">
                <label htmlFor="game-id-input" className="profile-game-id-label">
                  Nick no ARC Raiders
                </label>
                <div className="profile-game-id-row">
                  <input
                    id="game-id-input"
                    type="text"
                    className="profile-game-id-input"
                    placeholder="Ex: AndreGamer ou MeuNick#1234"
                    value={gameId}
                    onChange={e => setGameId(e.target.value)}
                    onBlur={saveGameId}
                    onKeyDown={e => e.key === "Enter" && saveGameId()}
                    maxLength={60}
                  />
                  {gameIdSaving && <span className="profile-game-id-status saving">Salvando...</span>}
                  {gameIdMsg && !gameIdSaving && (
                    <span className={`profile-game-id-status${gameIdMsg.includes("Erro") ? " error" : " ok"}`}>
                      {gameIdMsg}
                    </span>
                  )}
                </div>
                <p className="profile-game-id-hint">
                  Necessário para receber itens comprados na loja.
                </p>
              </div>
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

      <section aria-label="Carteira">
        <p className="home-section-label">Carteira</p>
        <div className="profile-stat-grid">
          <article className="profile-stat-card">
            <span>Carteira real</span>
            <strong>0</strong>
            <p>Saldo reaproveitado para compra direta de itens no marketplace.</p>
          </article>
          <article className="profile-stat-card">
            <span>Pontos do site</span>
            <strong>{formatNumber(points)}</strong>
            <p>Inclui pontos base da conta e bônus das tarefas diárias concluídas.</p>
          </article>
          <article className="profile-stat-card">
            <span>Resgates possíveis</span>
            <strong>{formatNumber(redeemableCount)}</strong>
            <p>Quantidade estimada de itens que o jogador já pode trocar.</p>
          </article>
        </div>
      </section>

      <section aria-label="Progresso diário">
        <p className="home-section-label">Progresso diário</p>
        <div className="profile-stat-grid">
          <article className="profile-stat-card"><span>Concluídas</span><strong>0/0</strong></article>
          <article className="profile-stat-card"><span>Pontos do dia</span><strong>0</strong></article>
          <article className="profile-stat-card"><span>Bônus</span><strong>N/D</strong></article>
        </div>
      </section>

      <section aria-label="Resumo da conta">
        <p className="home-section-label">Resumo da conta</p>
        <div className="profile-stat-grid">
          <article className="profile-stat-card"><span>Favoritos</span><strong>0</strong></article>
          <article className="profile-stat-card"><span>Itens no catálogo</span><strong>{formatNumber(data.items.length)}</strong></article>
          <article className="profile-stat-card"><span>Trades ativos</span><strong>{formatNumber(Array.isArray(data.trades) ? data.trades.length : 0)}</strong></article>
          <article className="profile-stat-card"><span>Mapas prontos</span><strong>{readyMaps}</strong></article>
        </div>
      </section>

      <section aria-label="Histórico">
        <p className="home-section-label">Histórico</p>
        <div className="profile-card">
          <p className="profile-empty">Nenhum evento registrado.</p>
        </div>
      </section>
    </div>
    </div>
  )
}


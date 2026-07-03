"use client"

import { useEffect, useState } from "react"
import { ChevronRight, Medal } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface RepData {
  reputation: number
  level: { min: number; name: string; color: string }
  next:  { min: number } | null
}

interface Props {
  onClose?:      () => void
  showStats?:    boolean
  onUserLoaded?: (userId: string | null) => void
}

export default function SidePanelUserHeader({ onClose, showStats = true, onUserLoaded }: Props) {
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null)
  const [displayName,  setDisplayName]  = useState("Visitante")
  const [loggedIn,     setLoggedIn]     = useState(false)
  const [repData,      setRepData]      = useState<RepData | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { onUserLoaded?.(null); return }
      setLoggedIn(true)
      setDisplayName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Visitante")
      onUserLoaded?.(user.id)
      supabase.from("profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      })
      fetch("/api/reputation", { cache: "no-store" })
        .then(r => r.json())
        .then((d: RepData) => setRepData(d))
        .catch(() => {})
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const initial = displayName[0]?.toUpperCase() ?? "S"

  const progressPct = (() => {
    if (!repData?.level) return 0
    if (!repData.next)   return 100
    const { reputation, level, next } = repData
    return Math.min(100, Math.round(((reputation - level.min) / (next.min - level.min)) * 100))
  })()

  return (
    <>
      <div className="store-user-card">
        <div className="store-user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : initial}
          <span className="store-user-level">1</span>
        </div>
        <div className="store-user-info">
          <strong>{displayName}</strong>
          <span className="store-user-online">
            {loggedIn && <span className="store-user-online-dot" />}
            {loggedIn ? "Online" : "Visitante"}
          </span>
        </div>
        {onClose && (
          <button type="button" className="store-panel-close" aria-label="Fechar painel" onClick={onClose}>
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {showStats && (
        <div className="store-user-stats">
          <div className="store-stats-row">
            <div className="store-reputation">
              <span>Reputação</span>
              <strong style={repData?.level ? { color: repData.level.color } : undefined}>
                {repData ? repData.reputation.toLocaleString("pt-BR") : "—"}
              </strong>
            </div>
            <div className="store-merchant-badge" style={repData?.level ? { color: repData.level.color } : undefined}>
              <span>{repData?.level?.name ?? "Sem nível"}</span>
              <Medal size={28} />
            </div>
          </div>
          <div className="store-reputation-bar">
            <span style={{ width: `${progressPct}%`, ...(repData?.level ? { background: repData.level.color } : {}) }} />
          </div>
        </div>
      )}
    </>
  )
}

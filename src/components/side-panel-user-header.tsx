"use client"

import { useEffect, useState } from "react"
import { ChevronRight, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Props {
  onClose: () => void
  showStats?: boolean
}

export default function SidePanelUserHeader({ onClose, showStats = true }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState("Visitante")
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setLoggedIn(true)
      setDisplayName(user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Visitante")
      supabase.from("profiles").select("avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      })
    })
  }, [])

  return (
    <>
      <div className="store-user-card">
        <div className="store-user-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : displayName[0]?.toUpperCase()}
          <span className="store-user-level">42</span>
        </div>
        <div className="store-user-info">
          <strong>{displayName}</strong>
          <span className="store-user-online">
            {loggedIn && <span className="store-user-online-dot" />}
            {loggedIn ? "Online" : "Visitante"}
          </span>
        </div>
        <button type="button" className="store-panel-close" aria-label="Fechar painel" onClick={onClose}>
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {showStats && (
        <div className="store-user-stats">
          <div className="store-stats-row">
            <div className="store-reputation">
              <span>Reputação</span>
              <strong>5.250</strong>
            </div>
            <div className="store-merchant-badge">
              <span>Mercador</span>
              <ShieldCheck size={28} />
            </div>
          </div>
          <div className="store-reputation-bar">
            <span style={{ width: "90%" }} />
          </div>
        </div>
      )}
    </>
  )
}

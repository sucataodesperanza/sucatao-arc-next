"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton({ variant }: { variant?: "icon" }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  if (variant === "icon") {
    return (
      <button type="button" onClick={handleLogout} className="sidebar-link" data-tooltip="Sair">
        <LogOut size={22} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{ border: "1px solid rgba(255,212,0,0.3)", background: "rgba(255,212,0,0.06)", color: "var(--yellow)", padding: "0 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", cursor: "pointer" }}
    >
      Sair
    </button>
  )
}

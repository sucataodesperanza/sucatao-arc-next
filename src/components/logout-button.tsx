"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
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

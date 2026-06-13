import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "./sidebar-nav"

export async function Sidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  let avatarUrl: string | null = null
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_admin, avatar_url").eq("id", user.id).single()
    isAdmin = !!profile?.is_admin
    avatarUrl = profile?.avatar_url ?? null
  }

  return <SidebarNav isLoggedIn={!!user} isAdmin={isAdmin} avatarUrl={avatarUrl} />
}

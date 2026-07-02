import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SidebarNav } from "@/components/sidebar-nav"
import { AdminNotificationsProvider } from "@/components/admin-notifications"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import "../../styles/admin-layout.css"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, avatar_url")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) redirect("/")

  return (
    <AdminNotificationsProvider>
      <div className="app-shell-layout">
        <SidebarNav isLoggedIn={true} isAdmin={true} avatarUrl={profile.avatar_url ?? null} />
        <main className="content admin-content">
          <AdminBreadcrumb />
          {children}
        </main>
      </div>
    </AdminNotificationsProvider>
  )
}

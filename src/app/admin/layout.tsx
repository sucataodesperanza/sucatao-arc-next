import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebar } from "@/components/admin-sidebar"
import "../../styles/admin-layout.css"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/")

  return (
    <section className="utility-page admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <div className="utility-panel-head" style={{ marginBottom: "20px" }}>
          <div>
            <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)" }}>
              Painel administrativo
            </p>
            <strong style={{ fontSize: "22px" }}>Admin</strong>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

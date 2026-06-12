import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/")

  return (
    <section className="utility-page">
      <div className="utility-panel-head" style={{ marginBottom: "20px" }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", color: "var(--cyan)" }}>
            Painel administrativo
          </p>
          <strong style={{ fontSize: "22px" }}>Admin</strong>
        </div>
        <nav style={{ display: "flex", gap: "8px" }}>
          <Link
            href="/admin/pedidos"
            style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 14px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", textDecoration: "none" }}
          >
            Pedidos
          </Link>
          <Link
            href="/admin/catalogo"
            style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 14px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", textDecoration: "none" }}
          >
            Catálogo
          </Link>
          <Link
            href="/admin/estoque"
            style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "8px 14px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", textDecoration: "none" }}
          >
            Estoque
          </Link>
        </nav>
      </div>
      {children}
    </section>
  )
}

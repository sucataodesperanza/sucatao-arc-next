import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { NavLinks } from "./nav-links"
import { LogoutButton } from "./logout-button"

export async function Topbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>
            <strong>SUCATAO</strong>
            <em>// ARC COMPANION</em>
          </span>
        </Link>
        <NavLinks />
        <div className="auth-shell" aria-label="Sessão do usuário">
          {user ? (
            <>
              <div className="auth-badge">
                <span>Conectado</span>
                <strong>{user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Usuário"}</strong>
              </div>
              <Link href="/perfil" style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "0 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", display: "flex", alignItems: "center", textDecoration: "none" }}>
                Perfil
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <div className="auth-badge">
                <span>Offline</span>
                <strong>Visitante</strong>
              </div>
              <Link href="/login" style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", padding: "0 12px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase", display: "flex", alignItems: "center", textDecoration: "none" }}>
                Entrar
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="signal-bar" aria-label="Status do sistema">
        <strong>Sistema online</strong>
        <span>Dados comunitários carregados</span>
        <button type="button" id="resetButton">Resetar filtros</button>
      </section>
    </>
  )
}

import Link from "next/link"
import { auth } from "@/lib/auth"
import { Database, Map, Sword, Repeat2, Wrench, User } from "lucide-react"

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", borderColor: "var(--border)" }}
      >
        <span className="font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--accent)" }}>S</span> SUCATAO
          <em className="font-normal text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>// ARC COMPANION</em>
        </span>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/perfil" className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {session.user?.name}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Entrar
              </Link>
              <Link href="/registro" className="btn-primary" style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}>
                Criar conta
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--accent)" }}>
          Field intel database
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Banco de Itens<br />
          <span style={{ color: "var(--accent)" }}>ARC Raiders</span>
        </h1>
        <p className="text-lg max-w-lg" style={{ color: "var(--text-secondary)" }}>
          Preços, raridades, crafting e reciclagem em um painel brasileiro para consulta rápida.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/itens" className="btn-primary">Abrir catálogo</Link>
          <Link href="/arcs" className="btn-secondary">Ver ARCs</Link>
        </div>
      </section>

      {/* Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-6 pb-24 max-w-5xl mx-auto w-full">
        {[
          { href: "/itens", icon: Database, title: "Itens catalogados", desc: "Busca, filtros, valores e detalhe por item." },
          { href: "/trades", icon: Repeat2, title: "Marketplace", desc: "Ofertas, custo, trader e leitura rápida de troca." },
          { href: "/arcs", icon: Sword, title: "ARC intel", desc: "Ameaças, fraquezas, XP e drops clicáveis." },
          { href: "/mapas", icon: Map, title: "Mapas", desc: "Rotas, marcadores e intel de localização." },
          { href: "/crafting", icon: Wrench, title: "Crafting", desc: "Receitas, materiais base e saídas craftáveis." },
          { href: "/perfil", icon: User, title: "Perfil", desc: "Conta, progresso diário e histórico." },
        ].map(({ href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-2 rounded-2xl p-5 transition-colors"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
          >
            <Icon size={20} style={{ color: "var(--accent)" }} />
            <strong className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</strong>
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{desc}</span>
          </Link>
        ))}
      </section>
    </main>
  )
}

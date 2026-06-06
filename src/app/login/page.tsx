"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Zap } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const res = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)

    if (res?.error) {
      setError("E-mail ou senha incorretos.")
    } else {
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Sucatao<span style={{ color: "var(--accent)" }}> // ARC</span>
          </Link>
          <h1 className="mt-6 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Entrar na conta
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Bem-vindo de volta
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl p-6"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
        >
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,69,58,0.1)", color: "var(--error)", border: "1px solid rgba(255,69,58,0.2)" }}
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>E-mail</label>
            <input
              type="email"
              className="input-field"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Senha</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="input-field"
                style={{ paddingRight: "2.75rem" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Entrando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap size={16} />
                Entrar
              </span>
            )}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "var(--text-secondary)" }}>
          Não tem conta?{" "}
          <Link href="/registro" className="font-medium" style={{ color: "var(--accent)" }}>
            Criar conta
          </Link>
        </p>
        <Link href="/" className="flex justify-center text-xs mt-4" style={{ color: "var(--text-tertiary)" }}>
          ← Voltar ao companion
        </Link>
      </div>
    </div>
  )
}

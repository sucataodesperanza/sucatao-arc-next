"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login"
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  function switchMode(next: "login" | "register") {
    setMode(next)
    setStatus(next === "login" ? "" : "Crie sua conta gratuita.")
    setName("")
    setEmail("")
    setPassword("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus("")

    const supabase = createClient()

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) {
        setStatus("E-mail ou senha incorretos.")
      } else {
        router.refresh()
        router.push(searchParams.get("next") || "/")
      }
    } else {
      if (password.length < 6) {
        setStatus("A senha deve ter pelo menos 6 caracteres.")
        setLoading(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/confirmar-email`,
        },
      })
      setLoading(false)
      if (error) {
        setStatus(error.message || "Erro ao criar conta.")
      } else if (data.user?.identities?.length === 0) {
        setStatus("Este e-mail já está cadastrado.")
        switchMode("login")
      } else {
        setStatus("Conta criada! Verifique seu e-mail para confirmar.")
      }
    }
  }

  return (
    <AuthShell
      footer={
        <Link href="/recuperar-senha" className="auth-shell-footer-link">
          Não consegue fazer login?
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form auth-form-grow" aria-label={mode === "login" ? "Fazer login" : "Criar conta"}>
        <div className="auth-toggle-row">
          <button
            type="button"
            className={`auth-mode-button${mode === "login" ? " active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Fazer login
          </button>
          <button
            type="button"
            className={`auth-mode-button${mode === "register" ? " active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Criar conta
          </button>
          <span className={`auth-toggle-indicator${mode === "register" ? " register" : ""}`} />
        </div>

        <div className="auth-form-grid">
          {mode === "register" && (
            <label>
              <span className={name ? "auth-field-label-hidden" : ""}>Nome</span>
              <input
                type="text"
                maxLength={32}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            <span className={email ? "auth-field-label-hidden" : ""}>E-mail</span>
            <input
              type="email"
              maxLength={80}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span className={password ? "auth-field-label-hidden" : ""}>Senha</span>
            <input
              type="password"
              maxLength={48}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        </div>

        <div className="auth-actions auth-actions-end">
          <p className="auth-status">{status}</p>
          <button
            type="submit"
            className="auth-submit-arrow"
            disabled={loading}
            aria-label={mode === "login" ? "Fazer login" : "Criar conta"}
          >
            {loading ? <Loader2 size={20} className="auth-spinner" /> : <ArrowRight size={20} />}
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

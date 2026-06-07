"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Suspense } from "react"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login"
  )
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState("Entre com sua conta Sucatao.")
  const [loading, setLoading] = useState(false)

  function switchMode(next: "login" | "register") {
    setMode(next)
    setStatus(next === "login" ? "Entre com sua conta Sucatao." : "Crie sua conta gratuita.")
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
        router.push("/")
        router.refresh()
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
      <form onSubmit={handleSubmit} className="marker-modal auth-modal" aria-labelledby="authModalTitle">
        <p className="modal-kicker">Conta local</p>
        <h2 id="authModalTitle" style={{ margin: "-10px 0 0", color: "#fff", fontSize: "30px", lineHeight: 1, textTransform: "uppercase" }}>
          Entrar no Sucatao
        </h2>

        <div className="auth-toggle-row">
          <button
            type="button"
            className={`auth-mode-button${mode === "login" ? " active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`auth-mode-button${mode === "register" ? " active" : ""}`}
            onClick={() => switchMode("register")}
          >
            Criar conta
          </button>
        </div>

        <div className="marker-form-grid">
          {mode === "register" && (
            <label>
              <span>Nome</span>
              <input
                type="text"
                placeholder="Seu nome no site"
                maxLength={32}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
          )}
          <label>
            <span>E-mail</span>
            <input
              type="email"
              placeholder="voce@email.com"
              maxLength={80}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Senha</span>
            <input
              type="password"
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Sua senha"}
              maxLength={48}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        </div>

        <div className="marker-form-meta auth-form-meta">
          <span id="authStatusMessage">{status}</span>
          <button
            type="submit"
            disabled={loading}
            style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", cursor: "pointer", minHeight: "42px", padding: "0 20px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}

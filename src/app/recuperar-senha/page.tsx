"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("Informe o e-mail da sua conta para receber o link de redefinição.")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus("")

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/confirmar-email`,
    })

    setLoading(false)

    if (error) {
      setStatus(error.message || "Não foi possível enviar o e-mail de recuperação.")
    } else {
      setSent(true)
      setStatus("Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha.")
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="recoverShellTitle">
        <div>
          <p className="auth-shell-kicker">Conta Sucatão</p>
          <h1 id="recoverShellTitle" className="auth-shell-title">Recuperar senha</h1>
        </div>

        {!sent && (
          <div className="auth-form-grid">
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
          </div>
        )}

        <div className="auth-actions">
          <p className="auth-status">{status}</p>
          {!sent && (
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          )}
        </div>

        <div className="auth-link-row">
          <Link href="/login" className="auth-link">
            ← Voltar para o login
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

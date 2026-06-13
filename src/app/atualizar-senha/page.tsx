"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"

export default function AtualizarSenhaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState("Defina sua nova senha de acesso.")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setReady(true)
      } else {
        setStatus("Link inválido ou expirado. Solicite uma nova recuperação de senha.")
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setStatus("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setStatus("As senhas não coincidem.")
      return
    }
    setLoading(true)
    setStatus("")

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      if (error.message === "New password should be different from the old password.") {
        setStatus("A nova senha deve ser diferente da senha atual.")
      } else {
        setStatus(error.message || "Não foi possível atualizar a senha.")
      }
    } else {
      setDone(true)
      setStatus("Senha atualizada! Redirecionando para o login...")
      setTimeout(() => {
        router.push("/login")
        router.refresh()
      }, 1800)
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="updatePasswordTitle">
        <div>
          <p className="auth-shell-kicker">Conta Sucatão</p>
          <h1 id="updatePasswordTitle" className="auth-shell-title">Nova senha</h1>
        </div>

        {ready && !done && (
          <div className="auth-form-grid">
            <label>
              <span className={password ? "auth-field-label-hidden" : ""}>Nova senha</span>
              <input
                type="password"
                maxLength={48}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              <span className={confirmPassword ? "auth-field-label-hidden" : ""}>Confirmar senha</span>
              <input
                type="password"
                maxLength={48}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
        )}

        <div className="auth-actions">
          <p className="auth-status">{status}</p>
          {ready && (
            <button type="submit" className="auth-submit" disabled={loading || done}>
              {done ? <Loader2 size={18} className="auth-spinner" /> : loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  )
}

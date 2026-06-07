"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
      <form onSubmit={handleSubmit} className="marker-modal auth-modal" aria-labelledby="updatePasswordTitle">
        <p className="modal-kicker">Conta local</p>
        <h2 id="updatePasswordTitle" style={{ margin: "-10px 0 0", color: "#fff", fontSize: "30px", lineHeight: 1, textTransform: "uppercase" }}>
          Nova senha
        </h2>

        {ready && !done && (
          <div className="marker-form-grid">
            <label>
              <span>Nova senha</span>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                maxLength={48}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              <span>Confirmar senha</span>
              <input
                type="password"
                placeholder="Repita a nova senha"
                maxLength={48}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>
          </div>
        )}

        <div className="marker-form-meta auth-form-meta">
          <span id="updatePasswordStatus">{status}</span>
          {ready && !done && (
            <button
              type="submit"
              disabled={loading}
              style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", cursor: "pointer", minHeight: "42px", padding: "0 20px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

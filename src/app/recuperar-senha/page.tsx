"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

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
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
      <form onSubmit={handleSubmit} className="marker-modal auth-modal" aria-labelledby="recoverModalTitle">
        <p className="modal-kicker">Conta local</p>
        <h2 id="recoverModalTitle" style={{ margin: "-10px 0 0", color: "#fff", fontSize: "30px", lineHeight: 1, textTransform: "uppercase" }}>
          Recuperar senha
        </h2>

        {!sent && (
          <div className="marker-form-grid">
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
          </div>
        )}

        <div className="marker-form-meta auth-form-meta">
          <span id="recoverStatusMessage">{status}</span>
          {!sent && (
            <button
              type="submit"
              disabled={loading}
              style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", cursor: "pointer", minHeight: "42px", padding: "0 20px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link href="/login" style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 800, textDecoration: "none" }}>
            ← Voltar para o login
          </Link>
        </div>
      </form>
    </div>
  )
}

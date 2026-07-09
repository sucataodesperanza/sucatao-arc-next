"use client"

import { useState, Suspense } from "react"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth-shell"

const copy = {
  signup: {
    kicker: "Conta Sucatão",
    title: "Confirmar e-mail",
    intro: "Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.",
    confirmLabel: "Confirmar e-mail",
    success: "E-mail confirmado! Redirecionando...",
    redirectTo: "/",
  },
  recovery: {
    kicker: "Conta Sucatão",
    title: "Redefinir senha",
    intro: "Clique no botão abaixo para confirmar e continuar para a redefinição de senha.",
    confirmLabel: "Confirmar e continuar",
    success: "Confirmado! Redirecionando para redefinir sua senha...",
    redirectTo: "/atualizar-senha",
  },
} as const

function ResendForm({ type }: { type: "recovery" | "signup" }) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const supabase = createClient()

    if (type === "recovery") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/confirmar-email`,
      })
      setLoading(false)
      if (err) { setError("Não foi possível reenviar. Tente novamente."); return }
    } else {
      const { error: err } = await supabase.auth.resend({ type: "signup", email,
        options: { emailRedirectTo: `${window.location.origin}/confirmar-email` },
      })
      setLoading(false)
      if (err) { setError("Não foi possível reenviar. Tente novamente."); return }
    }

    setSent(true)
  }

  if (sent) {
    return <p className="auth-status">Novo link enviado! Verifique sua caixa de entrada (e o spam).</p>
  }

  return (
    <form onSubmit={handleResend} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <label>
        <span className={email ? "auth-field-label-hidden" : ""}>Seu e-mail</span>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          maxLength={80}
        />
      </label>
      {error && <p className="auth-status" style={{ color: "var(--red)" }}>{error}</p>}
      <button type="submit" className="auth-submit" disabled={loading}>
        {loading ? "Enviando..." : "Reenviar link"}
      </button>
    </form>
  )
}

function ConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") === "recovery" ? "recovery" : "signup"
  const texts = copy[type]

  const [status, setStatus] = useState(tokenHash ? texts.intro : "")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleConfirm() {
    if (!tokenHash) return
    setLoading(true)
    setStatus("")

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    setLoading(false)

    if (error) {
      setStatus("Link inválido ou expirado. Solicite um novo e-mail abaixo.")
    } else {
      // Registra indicação se houver cookie ref_code (fire-and-forget)
      if (type === "signup") {
        fetch("/api/referral/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {})
      }
      setDone(true)
      setStatus(texts.success)
      setTimeout(() => {
        router.push(texts.redirectTo)
        router.refresh()
      }, 1500)
    }
  }

  // Link chegou sem token — mostra formulário de reenvio diretamente
  if (!tokenHash) {
    return (
      <AuthShell>
        <div className="auth-form" aria-labelledby="confirmEmailTitle">
          <div>
            <p className="auth-shell-kicker">Conta Sucatão</p>
            <h1 id="confirmEmailTitle" className="auth-shell-title">Link inválido</h1>
          </div>
          <div className="auth-actions">
            <p className="auth-status">
              O link expirou ou chegou incompleto. Informe seu e-mail para receber um novo.
            </p>
            <ResendForm type={type} />
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="auth-form" aria-labelledby="confirmEmailTitle">
        <div>
          <p className="auth-shell-kicker">{texts.kicker}</p>
          <h1 id="confirmEmailTitle" className="auth-shell-title">{texts.title}</h1>
        </div>

        <div className="auth-actions">
          {status && <p className="auth-status">{status}</p>}
          {done ? (
            <button type="button" className="auth-submit" disabled>
              <Loader2 size={18} className="auth-spinner" />
            </button>
          ) : (
            <>
              <button type="button" onClick={handleConfirm} disabled={loading} className="auth-submit">
                {loading ? "Confirmando..." : texts.confirmLabel}
              </button>
              {status.includes("expirado") && <ResendForm type={type} />}
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense>
      <ConfirmForm />
    </Suspense>
  )
}

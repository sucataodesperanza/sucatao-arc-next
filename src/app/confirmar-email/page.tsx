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

function ConfirmForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") === "recovery" ? "recovery" : "signup"
  const texts = copy[type]

  const [status, setStatus] = useState(
    tokenHash ? texts.intro : "Link inválido ou incompleto. Solicite um novo e-mail."
  )
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
      setStatus("Link inválido ou expirado. Solicite um novo e-mail.")
    } else {
      setDone(true)
      setStatus(texts.success)
      setTimeout(() => {
        router.push(texts.redirectTo)
        router.refresh()
      }, 1500)
    }
  }

  return (
    <AuthShell>
      <div className="auth-form" aria-labelledby="confirmEmailTitle">
        <div>
          <p className="auth-shell-kicker">{texts.kicker}</p>
          <h1 id="confirmEmailTitle" className="auth-shell-title">{texts.title}</h1>
        </div>

        <div className="auth-actions">
          <p className="auth-status">{status}</p>
          {done ? (
            <button type="button" className="auth-submit" disabled>
              <Loader2 size={18} className="auth-spinner" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !tokenHash}
              className="auth-submit"
            >
              {loading ? "Confirmando..." : texts.confirmLabel}
            </button>
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

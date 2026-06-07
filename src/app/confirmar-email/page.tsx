"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const copy = {
  signup: {
    kicker: "Conta local",
    title: "Confirmar e-mail",
    intro: "Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.",
    confirmLabel: "Confirmar e-mail",
    success: "E-mail confirmado! Redirecionando...",
    redirectTo: "/",
  },
  recovery: {
    kicker: "Conta local",
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
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
      <div className="marker-modal auth-modal" aria-labelledby="confirmEmailTitle">
        <p className="modal-kicker">{texts.kicker}</p>
        <h2 id="confirmEmailTitle" style={{ margin: "-10px 0 0", color: "#fff", fontSize: "30px", lineHeight: 1, textTransform: "uppercase" }}>
          {texts.title}
        </h2>

        <div className="marker-form-meta auth-form-meta">
          <span id="confirmEmailStatus">{status}</span>
          {!done && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !tokenHash}
              style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", cursor: "pointer", minHeight: "42px", padding: "0 20px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
            >
              {loading ? "Confirmando..." : texts.confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense>
      <ConfirmForm />
    </Suspense>
  )
}

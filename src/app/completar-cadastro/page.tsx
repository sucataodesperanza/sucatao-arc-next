"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/cpf"
import { AuthShell } from "@/components/auth-shell"

function CompletarCadastroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/perfil"
  const cpfRequired = searchParams.get("cpf") === "1"

  const [gameId, setGameId] = useState("")
  const [cpf, setCpf] = useState("")
  const [status, setStatus] = useState(
    cpfRequired
      ? "Informe seu ID do jogo e o CPF para finalizar o pedido com PIX."
      : "Informe seu ID do jogo para finalizar o pedido."
  )
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/login?next=${encodeURIComponent(`/completar-cadastro?next=${next}`)}`)
        return
      }
      supabase.from("profiles").select("cpf, game_id").eq("id", user.id).single().then(({ data }) => {
        if (data?.cpf) setCpf(formatCpf(data.cpf))
        if (data?.game_id) setGameId(data.game_id)
        setChecking(false)
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!gameId.trim()) {
      setStatus("Informe seu ID do jogo.")
      return
    }

    if (cpfRequired && !isValidCpf(cpf)) {
      setStatus("CPF inválido. Confira os números digitados.")
      return
    }

    setLoading(true)
    setStatus("")

    const res = await fetch("/api/profile/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: gameId.trim(), ...(cpfRequired ? { cpf: onlyDigits(cpf) } : {}) }),
    })

    setLoading(false)

    if (res.ok) {
      router.push(next)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setStatus(`${data.error || "Erro ao salvar seus dados."}${data.detail ? ` (${data.detail})` : ""}`)
    }
  }

  if (checking) {
    return (
      <AuthShell>
        <p className="auth-status">Carregando...</p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="cadastroShellTitle">
        <div>
          <p className="auth-shell-kicker">Complete seu cadastro</p>
          <h1 id="cadastroShellTitle" className="auth-shell-title">Falta pouco</h1>
          <p className="auth-shell-text" style={{ marginTop: "12px" }}>
            Precisamos do seu ID do jogo para que o vendedor consiga te encontrar e entregar os itens.
            {cpfRequired && " Para comprar itens com saldo real (pagamento via PIX), o Mercado Pago também exige o CPF do pagador por regulamentação do Banco Central."}
            {" "}Esses dados ficam salvos no seu perfil e não precisam ser informados de novo.
          </p>
        </div>

        <div className="auth-form-grid">
          <label>
            <span className={gameId ? "auth-field-label-hidden" : ""}>ID do jogo</span>
            <input
              type="text"
              maxLength={64}
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {cpfRequired && (
            <label>
              <span className={cpf ? "auth-field-label-hidden" : ""}>CPF</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                required
                autoComplete="off"
              />
            </label>
          )}
        </div>

        <div className="auth-actions">
          <p className="auth-status">{status}</p>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar e continuar"}
          </button>
        </div>
      </form>
    </AuthShell>
  )
}

export default function CompletarCadastroPage() {
  return (
    <Suspense>
      <CompletarCadastroForm />
    </Suspense>
  )
}

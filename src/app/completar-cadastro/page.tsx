"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCpf, isValidCpf, onlyDigits } from "@/lib/cpf"

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
      <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
        <p style={{ color: "var(--muted)" }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: "24px", background: "rgba(2,5,10,0.9)", backdropFilter: "blur(12px)" }}>
      <form onSubmit={handleSubmit} className="marker-modal auth-modal" aria-labelledby="cadastroModalTitle">
        <p className="modal-kicker">Complete seu cadastro</p>
        <h2 id="cadastroModalTitle" style={{ margin: "-10px 0 0", color: "#fff", fontSize: "30px", lineHeight: 1, textTransform: "uppercase" }}>
          Falta pouco
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px", lineHeight: 1.6 }}>
          Precisamos do seu ID do jogo para que o vendedor consiga te encontrar e entregar os itens.
          {cpfRequired && " Para comprar itens com saldo real (pagamento via PIX), o Mercado Pago também exige o CPF do pagador por regulamentação do Banco Central."}
          {" "}Esses dados ficam salvos no seu perfil e não precisam ser informados de novo.
        </p>

        <div className="marker-form-grid">
          <label>
            <span>ID do jogo</span>
            <input
              type="text"
              placeholder="Seu ID no ARC Raiders"
              maxLength={64}
              value={gameId}
              onChange={e => setGameId(e.target.value)}
              required
              autoComplete="off"
            />
          </label>
          {cpfRequired && (
            <label>
              <span>CPF</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000.000.000-00"
                maxLength={14}
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                required
                autoComplete="off"
              />
            </label>
          )}
        </div>

        <div className="marker-form-meta auth-form-meta">
          <span id="cadastroStatusMessage">{status}</span>
          <button
            type="submit"
            disabled={loading}
            style={{ border: "1px solid var(--line)", background: "rgba(0,217,255,0.08)", color: "var(--cyan)", cursor: "pointer", minHeight: "42px", padding: "0 20px", fontSize: "11px", fontWeight: 950, textTransform: "uppercase" }}
          >
            {loading ? "Salvando..." : "Salvar e continuar"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CompletarCadastroPage() {
  return (
    <Suspense>
      <CompletarCadastroForm />
    </Suspense>
  )
}

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-guard"

// Endpoint preparado para sync com MetaForge maps API.
// Desabilitado até https://metaforge.app/api/game-map-data estar estável.

export async function POST() {
  const guard = await requireAdmin()
  if (guard.error) return guard.error

  try {
    const res = await fetch("https://metaforge.app/api/game-map-data", {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({
        error: `MetaForge maps API retornou ${res.status}. O endpoint ainda não está disponível.`,
        status: res.status,
      }, { status: 502 })
    }

    // TODO: processar resposta e atualizar tabela maps quando o endpoint funcionar
    // const data = await res.json()
    // ...

    return NextResponse.json({ ok: true, message: "Sync realizado." })
  } catch (err) {
    return NextResponse.json({
      error: "API do MetaForge indisponível no momento. Tente novamente mais tarde.",
      detail: (err as Error).message,
    }, { status: 502 })
  }
}

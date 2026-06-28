import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAdminEmail } from "@/lib/resend"

// Chamado por um cron job (ex: Vercel Cron) para notificar admins
// de agendamentos com prazo próximo do vencimento (< 24h).
// Protegido por CRON_SECRET para chamadas externas.

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 3600000)

  // Missões pending que expiram em menos de 24h e ainda não foram agendadas
  const { data: expiring } = await admin
    .from("contract_mission_schedules")
    .select(`
      id, user_id, expires_at,
      contract_group_missions(title, position),
      contract_groups(title, type)
    `)
    .eq("status", "pending")
    .lte("expires_at", in24h.toISOString())
    .gte("expires_at", now.toISOString())

  if (!expiring?.length) return NextResponse.json({ notified: 0 })

  // Busca nomes dos usuários
  const userIds = [...new Set(expiring.map(e => e.user_id))]
  const { data: profiles } = await admin.from("profiles").select("id, name").in("id", userIds)
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name ?? p.id.slice(0, 8)]))

  const rows = expiring.map(e => {
    const mission = e.contract_group_missions as unknown as { title: string; position: number } | null
    const group   = e.contract_groups as unknown as { title: string; type: string } | null
    const expires = new Date(e.expires_at).toLocaleString("pt-BR")
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #333">${profileMap[e.user_id]}</td>
      <td style="padding:8px;border-bottom:1px solid #333">${group?.title ?? "—"} (${group?.type ?? "—"})</td>
      <td style="padding:8px;border-bottom:1px solid #333">Dia ${mission?.position} — ${mission?.title ?? "—"}</td>
      <td style="padding:8px;border-bottom:1px solid #333;color:#ff6171">${expires}</td>
    </tr>`
  }).join("")

  await sendAdminEmail(
    `⚠️ ${expiring.length} agendamento(s) de contrato expirando em menos de 24h`,
    `<div style="font-family:sans-serif;background:#0a0e16;color:#e8edf2;padding:24px;border-radius:8px">
      <h2 style="color:#ffd400;margin:0 0 16px">Agendamentos próximos do vencimento</h2>
      <p style="color:#6f7785;margin:0 0 16px">Os usuários abaixo ainda não agendaram a entrega das missões listadas.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="text-align:left;color:#6f7785;font-size:11px;text-transform:uppercase">
            <th style="padding:8px">Usuário</th>
            <th style="padding:8px">Contrato</th>
            <th style="padding:8px">Missão</th>
            <th style="padding:8px">Expira em</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#6f7785">Acesse o painel admin para acompanhar: /admin/contratos</p>
    </div>`
  )

  return NextResponse.json({ notified: expiring.length })
}

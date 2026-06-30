const DISCORD_API = "https://discord.com/api/v10"
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

function botHeaders() {
  return {
    Authorization: `Bot ${BOT_TOKEN}`,
    "Content-Type": "application/json",
  }
}

async function createDMChannel(discordId: string): Promise<string | null> {
  const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ recipient_id: discordId }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.id as string
}

export async function sendDiscordDM(discordId: string | null | undefined, content: string): Promise<void> {
  if (!discordId || !BOT_TOKEN) return
  try {
    const channelId = await createDMChannel(discordId)
    if (!channelId) return
    await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    })
  } catch {
    // DM é best-effort — falha não deve afetar o fluxo principal
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatItems(items: { name: string; quantity: number }[]): string {
  return items.map(i => `${i.quantity}x ${i.name}`).join(", ")
}

function brl(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

// ── Mensagens prontas ──────────────────────────────────────────────────────

export function dmPedidoConfirmado(userName: string, items: { name: string; quantity: number }[]): string {
  return `✅ Olá, **${userName}**!\n\nSeu pedido foi confirmado! Os itens (**${formatItems(items)}**) já estão no seu inventário.`
}

export function dmPedidoPago(userName: string, items: { name: string; quantity: number }[], total: number): string {
  return `💰 Olá, **${userName}**!\n\nPagamento de **${brl(total)}** confirmado!\n\nItens: **${formatItems(items)}**\n\nNossa equipe vai entrar em contato por aqui para combinar a entrega dentro do jogo.`
}

export function dmRecompensaCreditada(userName: string, contextLabel: string, params: { points?: number; itemName?: string | null }): string {
  const parts: string[] = []
  if (params.points && params.points > 0) parts.push(`**${params.points.toLocaleString("pt-BR")} pontos**`)
  if (params.itemName) parts.push(`**${params.itemName}**`)
  const reward = parts.length > 0 ? parts.join(" e ") : "sua recompensa"
  return `🎁 Olá, **${userName}**!\n\n${contextLabel} foi concluído(a) e você recebeu ${reward}! Confira seu perfil no Sucatão.`
}

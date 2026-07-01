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

// ── Canais privados de entrega (Fase 4) ─────────────────────────────────────

type EmbedField = { name: string; value: string; inline?: boolean }
type Embed = {
  title?: string
  description?: string
  color?: number
  fields?: EmbedField[]
  footer?: { text: string }
  timestamp?: string
}

// VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY
const CHANNEL_PERMS = "68608"

export function embedCanalEntrega(params: {
  orderId: string
  buyerName: string
  items: { name: string; quantity: number }[]
  total: number
}): Embed {
  return {
    color: 0x22c55e,
    title: `📦 Entrega — Pedido #${params.orderId.slice(0, 8)}`,
    description:
      "Canal criado para vocês combinarem a entrega in-game.\n\n" +
      "> ⚠️ Não compartilhem dados pessoais aqui. Qualquer problema, acionem um admin.",
    fields: [
      { name: "Comprador", value: params.buyerName, inline: true },
      { name: "Total pago", value: brl(params.total), inline: true },
      { name: "Itens", value: formatItems(params.items) },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "Sucatão de Speranza · Canal removido automaticamente após a entrega" },
  }
}

export function embedTradeTicket(params: {
  acceptanceId: string
  playerName: string
  itemName: string
  itemQty: number
  offerPoints: number
  gameId?: string | null
}): Embed {
  const fields: EmbedField[] = [
    { name: "Jogador",          value: params.playerName,                            inline: true },
    { name: "Pontos a receber", value: `${params.offerPoints.toLocaleString("pt-BR")} pts`, inline: true },
    { name: "Item a entregar",  value: `${params.itemQty}× ${params.itemName}` },
  ]
  if (params.gameId) fields.push({ name: "Game ID", value: params.gameId })
  return {
    color: 0x5865f2,
    title: `🔄 Trade — #${params.acceptanceId.slice(0, 8).toUpperCase()}`,
    description:
      "Canal criado para combinarem a entrega do item in-game.\n\n" +
      "> ⚠️ Não compartilhem dados pessoais aqui. Qualquer problema, acionem um admin.",
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "Sucatão de Speranza · Canal removido automaticamente após conclusão" },
  }
}

export async function createPrivateChannel(params: {
  name: string
  topic: string
  buyerDiscordId: string
  embed: Embed
  categoryId?: string
}): Promise<string | null> {
  const guildId    = process.env.DISCORD_GUILD_ID
  const categoryId = params.categoryId ?? process.env.DISCORD_ORDERS_CATEGORY_ID
  const adminRole  = process.env.DISCORD_ADMIN_ROLE_ID
  if (!guildId || !categoryId || !adminRole || !BOT_TOKEN) return null

  const permission_overwrites = [
    { id: guildId, type: 0, deny: "1024" },                      // @everyone sem acesso
    { id: adminRole, type: 0, allow: CHANNEL_PERMS },             // role admin
    { id: params.buyerDiscordId, type: 1, allow: CHANNEL_PERMS }, // comprador
  ]

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({
        name: params.name,
        type: 0,
        parent_id: categoryId,
        topic: params.topic,
        permission_overwrites,
      }),
    })
    if (!res.ok) return null
    const channel = await res.json()

    await fetch(`${DISCORD_API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content: `<@${params.buyerDiscordId}>`, embeds: [params.embed] }),
    }).catch(() => {})

    return channel.id as string
  } catch {
    return null
  }
}

export async function deleteDiscordChannel(channelId: string | null | undefined): Promise<void> {
  if (!channelId || !BOT_TOKEN) return
  await fetch(`${DISCORD_API}/channels/${channelId}`, {
    method: "DELETE",
    headers: botHeaders(),
  }).catch(() => {})
}

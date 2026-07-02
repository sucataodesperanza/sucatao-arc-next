const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

type EmbedField = { name: string; value: string; inline?: boolean }

type Embed = {
  title: string
  description?: string
  color: number
  fields?: EmbedField[]
  footer?: { text: string }
  timestamp?: string
}

async function send(embed: Embed) {
  if (!WEBHOOK_URL) return
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [{ ...embed, timestamp: new Date().toISOString() }] }),
  }).catch(() => {})
}

// ── Cores ──────────────────────────────────────────────────────────────────
const RED    = 0xF5090D  // pontos / confirmado
const YELLOW = 0xFFC107  // PIX pendente
const GREEN  = 0x22c55e  // entregue / concluído

// ── Helpers ────────────────────────────────────────────────────────────────
function formatItems(items: { name: string; quantity: number }[]) {
  return items.map(i => `• **${i.name}** × ${i.quantity}`).join("\n")
}

function brl(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

// ── Embeds públicos ────────────────────────────────────────────────────────

export async function alertPedidoPontos(opts: {
  orderId: string
  userName: string
  gameId: string
  items: { name: string; quantity: number }[]
  pointsCost: number
}) {
  await send({
    title: "🟥 Novo pedido — Pontos",
    color: RED,
    fields: [
      { name: "Pedido", value: `\`${opts.orderId.slice(0, 8)}\``, inline: true },
      { name: "Jogador", value: opts.userName, inline: true },
      { name: "Game ID", value: opts.gameId, inline: true },
      { name: "Itens", value: formatItems(opts.items) },
      { name: "Custo", value: `${opts.pointsCost.toLocaleString("pt-BR")} pts`, inline: true },
      { name: "Status", value: "✅ Concluído (inventário atualizado)", inline: true },
    ],
    footer: { text: "Sucatão de Speranza" },
  })
}

export async function alertPedidoPix(opts: {
  orderId: string
  userName: string
  gameId: string
  items: { name: string; quantity: number }[]
  total: number
  couponCode?: string | null
  discountAmount?: number
}) {
  const fields: EmbedField[] = [
    { name: "Pedido", value: `\`${opts.orderId.slice(0, 8)}\``, inline: true },
    { name: "Jogador", value: opts.userName, inline: true },
    { name: "Game ID", value: opts.gameId, inline: true },
    { name: "Itens", value: formatItems(opts.items) },
    { name: "Total", value: brl(opts.total), inline: true },
  ]

  if (opts.couponCode && opts.discountAmount) {
    fields.push({ name: "Cupom", value: `${opts.couponCode} (−${brl(opts.discountAmount)})`, inline: true })
  }

  fields.push({ name: "Status", value: "⏳ Aguardando pagamento PIX", inline: true })

  await send({
    title: "🟨 Novo pedido — PIX",
    color: YELLOW,
    fields,
    footer: { text: "Sucatão de Speranza" },
  })
}

export async function alertPedidoPago(opts: {
  orderId: string
  userName: string
  gameId: string
  items: { name: string; quantity: number }[]
  total: number
}) {
  await send({
    title: "💰 Pagamento confirmado — entregar no jogo",
    color: GREEN,
    fields: [
      { name: "Pedido", value: `\`${opts.orderId.slice(0, 8)}\``, inline: true },
      { name: "Jogador", value: opts.userName, inline: true },
      { name: "Game ID", value: opts.gameId, inline: true },
      { name: "Itens a entregar", value: formatItems(opts.items) },
      { name: "Valor recebido", value: brl(opts.total), inline: true },
      { name: "Ação", value: "Combine a entrega com o comprador no Discord", inline: true },
    ],
    footer: { text: "Sucatão de Speranza" },
  })
}

export async function alertCofresExpedicao(opts: {
  orderId: string
  userName: string
  gameId: string
  packsCount: number
  totalSlots: number
  expeditionName: string
  paymentMethod: "pontos" | "pix"
}) {
  const method = opts.paymentMethod === "pontos" ? "Pontos" : "PIX"
  await send({
    title: `📦 Cofre de Expedição — ${method}`,
    color: opts.paymentMethod === "pontos" ? RED : GREEN,
    fields: [
      { name: "Pedido",      value: `\`${opts.orderId.slice(0, 8)}\``,                         inline: true },
      { name: "Jogador",     value: opts.userName,                                               inline: true },
      { name: "Game ID",     value: opts.gameId,                                                 inline: true },
      { name: "Expedição",   value: opts.expeditionName,                                         inline: true },
      { name: "Pacotes",     value: `${opts.packsCount}× pack (${opts.packsCount * 20} slots)`, inline: true },
      { name: "Total slots", value: `${opts.totalSlots} slots acumulados`,                       inline: true },
      { name: "Status",      value: "✅ Slots creditados no cofre",                              inline: true },
    ],
    footer: { text: "Sucatão de Speranza" },
  })
}

export async function alertItemEntregue(opts: {
  orderId: string
  userName: string
  gameId: string
  confirmedBy?: "comprador" | "admin"
}) {
  const who = opts.confirmedBy === "admin" ? "pelo admin" : "pelo comprador"
  await send({
    title: `✅ Entrega confirmada ${who}`,
    color: GREEN,
    fields: [
      { name: "Pedido", value: `\`${opts.orderId.slice(0, 8)}\``, inline: true },
      { name: "Jogador", value: opts.userName, inline: true },
      { name: "Game ID", value: opts.gameId, inline: true },
    ],
    footer: { text: "Sucatão de Speranza" },
  })
}

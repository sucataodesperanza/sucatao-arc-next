# Sistema Discord — Sucatão de Speranza

Integração Discord em fases: OAuth, DMs automáticas, alertas admin e canais privados de entrega.

Referência de implementação: `c:\dev\site-venda-itens-arc` (DropBay).

---

## Variáveis de ambiente necessárias

```env
# OAuth (vinculação de conta)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Bot (DMs + canais)
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=

# IDs de estrutura no servidor
DISCORD_ORDERS_CATEGORY_ID=   # Categoria onde ficam os canais de entrega
DISCORD_ADMIN_ROLE_ID=        # Role do admin (acesso automático aos canais)
DISCORD_ALERT_CHANNEL_ID=     # Canal onde chegam os alertas do bot
```

> **Status atual:** `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_WEBHOOK_URL` e `DISCORD_BOT_TOKEN` configurados (Fases 1, 2 e 3 implementadas). Fase 4 (canais privados de entrega) está implementada no código, mas **falta configurar `DISCORD_GUILD_ID`, `DISCORD_ORDERS_CATEGORY_ID` e `DISCORD_ADMIN_ROLE_ID`** no `.env.local` e na Vercel — sem essas variáveis, `createPrivateChannel` retorna `null` silenciosamente (no-op) e o fluxo de pagamento PIX continua funcionando normalmente, só sem o canal.

---

## Fases de implementação

### Fase 1 — OAuth: Vinculação de conta Discord _(implementar primeiro)_

**O que faz:** Usuário conecta sua conta Discord na página de perfil. O `discord_id` é salvo no banco, habilitando as fases seguintes.

**Fluxo:**
1. Botão "Conectar Discord" no perfil → chama `GET /api/auth/discord`
2. Redireciona para `discord.com/oauth2/authorize?scope=identify`
3. Discord redireciona para `/api/auth/discord/callback?code=...`
4. Callback troca o code por token → busca `/users/@me` → salva `discord_id` no perfil

**Banco de dados — migração necessária:**
```sql
alter table public.profiles
  add column if not exists discord_id text null,
  add column if not exists discord_username text null,
  add column if not exists discord_avatar text null;
```

**Arquivos a criar:**
| Arquivo | Responsabilidade |
|---|---|
| `src/app/api/auth/discord/route.ts` | Inicia o OAuth, redireciona para Discord |
| `src/app/api/auth/discord/callback/route.ts` | Recebe o code, troca por token, salva discord_id |
| `src/lib/require-discord.ts` | Middleware: bloqueia endpoints se discord_id ausente |

---

### Fase 2 — Alertas admin por webhook _(mais simples, não precisa de bot)_

**O que faz:** Envia embeds para um canal Discord do admin quando eventos importantes acontecem. Usa webhook simples — sem bot token necessário.

**Eventos e embeds:**

| Evento | Trigger | Embed |
|---|---|---|
| Novo pedido na loja | POST `/api/store/checkout` | Comprador, itens, total, tipo (pontos/pix) |
| Pedido PIX confirmado | webhook de pagamento | Comprador, itens, valor, canal de entrega |
| Novo contrato solicitado | POST contratos | Usuário, tipo de contrato, recompensa |
| Novo usuário cadastrado | signup confirm | Username, data |

**Arquivo a criar:**
```
src/lib/discord-webhook.ts
```

```typescript
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

export async function sendAdminAlert(embed: object) {
  if (!WEBHOOK_URL) return
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {})
}
```

**Variável extra necessária:**
```env
DISCORD_WEBHOOK_URL=   # URL do webhook do canal de alertas (gerar no Discord)
```

> Webhook é a abordagem mais simples — cria em Configurações do Canal → Integrações → Webhooks.

---

### Fase 3 — DMs automáticas ao usuário _(requer Fase 1 + bot token)_ ✅ Implementado

**O que faz:** O bot envia DM privada ao usuário quando algo acontece com a conta dele. Só dispara se o usuário tiver `discord_id` vinculado (Fase 1) — caso contrário, `sendDiscordDM` é um no-op silencioso.

**Arquivo:** `src/lib/discord-bot.ts`

Funções:
- `sendDiscordDM(discordId, content)` — abre/reusa canal de DM via bot e envia a mensagem. Não faz nada se `discordId` ou `DISCORD_BOT_TOKEN` ausentes.
- `dmPedidoConfirmado(userName, items)` — pedido de pontos resgatado (itens já no inventário)
- `dmPedidoPago(userName, items, total)` — PIX confirmado, aguardando combinar entrega
- `dmRecompensaCreditada(userName, contextLabel, { points, itemName })` — genérica para qualquer recompensa creditada (pontos e/ou item)

**Pontos de disparo reais (mapeados a partir do código existente):**

| Evento | Arquivo | Mensagem |
|---|---|---|
| Pedido de pontos finalizado | `src/app/api/store/checkout/route.ts` | `dmPedidoConfirmado` |
| Pagamento PIX aprovado | `src/app/api/store/webhooks/mercadopago/route.ts` | `dmPedidoPago` |
| Contrato concluído (admin) | `src/app/api/admin/contratos/acceptances/[id]/complete/route.ts` | `dmRecompensaCreditada` (pontos do contrato) |
| Troca concluída (admin) | `src/app/api/admin/trades/acceptances/[id]/complete/route.ts` | `dmRecompensaCreditada` (pontos da troca) |
| Missão de contrato confirmada (admin) | `src/app/api/admin/contratos/schedules/[id]/confirm/route.ts` | `dmRecompensaCreditada` (pontos e/ou item da missão) |

**Não implementado — sem fluxo correspondente no código ainda:**
- "Contrato rejeitado" — não existe um fluxo de aprovação/rejeição de contrato distinto da conclusão.
- "Bônus de lançamento (25k pts/24h)" — mencionado em commit antigo mas não há cron/trigger no código atual.

Quando esses fluxos forem construídos, plugar `sendDiscordDM` com `dmRecompensaCreditada` ou uma mensagem nova, seguindo o mesmo padrão fire-and-forget.

---

### Fase 4 — Canal privado de entrega _(requer todas as fases anteriores)_ ✅ Implementado

**O que faz:** Para cada pedido PIX (`payment_method = "loja_oficial"`) aprovado, cria um canal privado temporário no Discord onde admin e comprador podem combinar a entrega em jogo. Canal é deletado quando o comprador confirma o recebimento. Só dispara se o comprador tiver `discord_id` vinculado (Fase 1) e as três variáveis de estrutura (`DISCORD_GUILD_ID`, `DISCORD_ORDERS_CATEGORY_ID`, `DISCORD_ADMIN_ROLE_ID`) estiverem configuradas — caso contrário, `createPrivateChannel` é um no-op silencioso.

**Lifecycle do canal:**
```
Pagamento PIX confirmado (webhook Mercado Pago)
  → Cria canal #entrega-{8 primeiros chars do orderId}
  → Adiciona: comprador + role admin
  → Embed de abertura com detalhes do pedido (embedCanalEntrega)
  → discord_channel_id salvo em orders
  → Admin combina entrega via canal
Comprador clica "Confirmar recebimento" no perfil (/perfil → Últimos Pedidos)
  → POST /api/store/orders/[id]/confirm-delivery
  → orders.delivered_at preenchido, discord_channel_id limpo
  → Canal deletado automaticamente (deleteDiscordChannel)
  → Alerta admin via webhook (alertItemEntregue)
```

**Banco de dados — migração aplicada:** `supabase/migrations/20260630_orders_delivery.sql`
```sql
alter table public.orders
  add column if not exists discord_channel_id text null,
  add column if not exists delivered_at timestamptz null;
```

**Funções em `discord-bot.ts`:**
- `createPrivateChannel({ name, topic, buyerDiscordId, embed })` — cria canal privado no `DISCORD_GUILD_ID`/`DISCORD_ORDERS_CATEGORY_ID`, com permissão para comprador + `DISCORD_ADMIN_ROLE_ID`, e envia o embed de abertura mencionando o comprador
- `deleteDiscordChannel(channelId)` — deleta o canal (best-effort, fire-and-forget)
- `embedCanalEntrega({ orderId, buyerName, items, total })` — embed de abertura do canal

**Pontos de disparo reais:**

| Evento | Arquivo |
|---|---|
| Pagamento PIX aprovado → cria canal | `src/app/api/store/webhooks/mercadopago/route.ts` |
| Comprador confirma recebimento → deleta canal | `src/app/api/store/orders/[id]/confirm-delivery/route.ts` |

**UI:** botão "Confirmar recebimento" aparece em `/perfil` → seção "Últimos Pedidos", apenas para pedidos com `payment_method = "loja_oficial"`, `payment_status = "paid"` e `delivered_at` ainda nulo.

**Permissões no canal criado:**
```
@everyone   → DENY tudo
Admin Role  → ALLOW view + send + history
Comprador   → ALLOW view + send + history
```

> Pedidos de pontos (`payment_method = "pontos"`, sem pagamento financeiro) **não criam canal** — entrega é feita automaticamente pelo sistema (ver `dmPedidoConfirmado` na Fase 3).

**Pendente:** não existe rota/UI de override para admin confirmar a entrega manualmente caso o comprador não confirme — só o próprio comprador pode confirmar hoje.

---

## Integração com páginas existentes

### Perfil (`/perfil` ou `/minha-conta`)
- Seção "Conta Discord" com botão conectar/desconectar
- Mostra avatar + username do Discord se conectado

### Carrinho / Checkout (`/carrinho`)
- Para itens PIX: badge "Você receberá notificação no Discord" se conectado
- Se não conectado: sugestão não-bloqueante de conectar

### Admin — Pedidos
- Coluna "Discord" na tabela de pedidos (mostra discord_username do comprador)
- Link direto para abrir DM com o comprador

---

## Referência de implementação (DropBay)

| DropBay | Sucatão equivalente |
|---|---|
| `src/lib/discord.ts` | `src/lib/discord-bot.ts` |
| `src/lib/require-discord.ts` | `src/lib/require-discord.ts` (igual) |
| `src/components/discord-gate.tsx` | Não necessário — Discord não é obrigatório no Sucatão |
| `src/app/api/auth/discord/route.ts` | Igual |
| `src/app/api/auth/discord/callback/route.ts` | Igual, mas usa `createClient()` do Supabase em vez de Prisma |
| Webhook PIX → DM + canal | `src/app/api/store/checkout/route.ts` (pontos) e webhook PIX (quando existir) |
| `embedCanalPedido()` | `embedCanalEntrega()` — adaptar campos para contexto Sucatão |

---

## Ordem de implementação recomendada

```
[x] 1. Criar aplicação no discord.com/developers
[x] 2. Criar bot, convidar para o servidor, copiar tokens
[x] 3. Criar webhook no canal de alertas
[x] 4. Adicionar variáveis de ambiente no Vercel
[x] 5. Fase 1 — OAuth (vinculação de conta)
[x] 6. Fase 2 — Alertas webhook (sem bot, mais simples)
[x] 7. Fase 3 — DMs automáticas
[x] 8. Fase 4 — Canais de entrega (código pronto, falta configurar DISCORD_GUILD_ID/DISCORD_ORDERS_CATEGORY_ID/DISCORD_ADMIN_ROLE_ID)
```

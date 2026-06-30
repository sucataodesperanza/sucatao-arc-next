# Sistema Discord — Sucatão de Speranza

Integração Discord em 4 fases: OAuth, alertas admin, DMs automáticas e canais privados de entrega.

---

## Status geral

| Fase | Descrição | Código | Ativo em prod |
|---|---|---|---|
| 1 — OAuth | Vinculação de conta Discord no perfil | ✅ | ✅ |
| 2 — Alertas admin | Webhooks para canal admin | ✅ | ✅ |
| 3 — DMs automáticas | Bot envia DM ao comprador em eventos | ✅ | ✅ |
| 4 — Canais de entrega | Canal privado por pedido PIX | ✅ | ⏳ faltam 3 vars + migração |

---

## Variáveis de ambiente

```env
# OAuth (vinculação de conta)
DISCORD_CLIENT_ID=          ✅ configurado
DISCORD_CLIENT_SECRET=      ✅ configurado

# Alertas admin
DISCORD_WEBHOOK_URL=        ✅ configurado

# Bot (DMs + canais)
DISCORD_BOT_TOKEN=          ✅ configurado (Vercel: pendente confirmar)

# Fase 4 — canais privados (ainda não configurados)
DISCORD_GUILD_ID=           ⏳ ID do servidor Discord
DISCORD_ORDERS_CATEGORY_ID= ⏳ ID da categoria onde os canais de entrega ficam
DISCORD_ADMIN_ROLE_ID=      ⏳ ID da role que acessa os canais automaticamente
```

> **Como pegar os IDs faltantes:** Ative o Modo Desenvolvedor no Discord (⚙️ → Avançado). Depois:
> - **Guild ID**: clique com botão direito no servidor → Copiar ID do Servidor
> - **Category ID**: crie uma categoria (ex: `📦 ENTREGAS`) → botão direito → Copiar ID
> - **Role ID**: Configurações do Servidor → Cargos → botão direito na role admin → Copiar ID do Cargo

Sem as 3 variáveis da Fase 4, `createPrivateChannel` retorna `null` silenciosamente — o pagamento PIX funciona normalmente, só não cria o canal.

---

## Pendências para a Fase 4 entrar em produção

1. **Aplicar a migração** `supabase/migrations/20260630_orders_delivery.sql` no banco de produção (via SQL editor do Supabase dashboard):
   ```sql
   alter table public.orders
     add column if not exists discord_channel_id text null,
     add column if not exists delivered_at timestamptz null;
   ```

2. **Adicionar as 3 variáveis** (`DISCORD_GUILD_ID`, `DISCORD_ORDERS_CATEGORY_ID`, `DISCORD_ADMIN_ROLE_ID`) no `.env.local` e na Vercel (Settings → Environment Variables).

3. **Confirmar que o bot tem permissão** para criar canais na categoria escolhida (servidor Discord → configurações da categoria → verificar se o bot está listado com permissão de gerenciar canais).

---

## Fase 1 — OAuth: Vinculação de conta Discord ✅

**O que faz:** Usuário conecta sua conta Discord na página de perfil. O `discord_id` é salvo no banco, habilitando todas as fases seguintes.

**Fluxo:**
1. Botão "Conectar Discord" no perfil → `GET /api/auth/discord`
2. Redireciona para `discord.com/oauth2/authorize?scope=identify`
3. Discord redireciona de volta para `/api/auth/discord/callback?code=...`
4. Callback troca o code por token → busca `/users/@me` → salva `discord_id`, `discord_username`, `discord_avatar` no perfil

**Arquivos:**
| Arquivo | Responsabilidade |
|---|---|
| `src/app/api/auth/discord/route.ts` | Inicia o OAuth |
| `src/app/api/auth/discord/callback/route.ts` | Recebe o code, salva discord_id |
| `src/app/api/auth/discord/disconnect/route.ts` | Limpa discord_id do perfil |

**Migração aplicada:** `discord_id`, `discord_username`, `discord_avatar` em `profiles`.

---

## Fase 2 — Alertas admin por webhook ✅

**O que faz:** Envia embeds para um canal Discord do admin quando eventos importantes acontecem. Usa webhook simples, sem bot token.

**Arquivo:** `src/lib/discord-webhook.ts`

**Alertas implementados:**

| Função | Evento |
|---|---|
| `alertPedidoPontos` | Novo pedido pago com pontos |
| `alertPedidoPix` | Novo pedido PIX criado (pendente de pagamento) |
| `alertPedidoPago` | Pagamento PIX confirmado pelo Mercado Pago |
| `alertItemEntregue` | Comprador confirmou o recebimento |

---

## Fase 3 — DMs automáticas ao usuário ✅

**O que faz:** Bot envia DM privada ao comprador em eventos. No-op silencioso se o usuário não tiver Discord vinculado ou se `DISCORD_BOT_TOKEN` estiver ausente.

**Arquivo:** `src/lib/discord-bot.ts`

**Pontos de disparo:**

| Evento | Arquivo | Mensagem |
|---|---|---|
| Pedido de pontos finalizado | `src/app/api/store/checkout/route.ts` | `dmPedidoConfirmado` |
| Pagamento PIX aprovado | `src/app/api/store/webhooks/mercadopago/route.ts` | `dmPedidoPago` |
| Contrato concluído (admin) | `src/app/api/admin/contratos/acceptances/[id]/complete/route.ts` | `dmRecompensaCreditada` |
| Troca concluída (admin) | `src/app/api/admin/trades/acceptances/[id]/complete/route.ts` | `dmRecompensaCreditada` |
| Missão confirmada (admin) | `src/app/api/admin/contratos/schedules/[id]/confirm/route.ts` | `dmRecompensaCreditada` |

---

## Fase 4 — Canais privados de entrega ✅ (código pronto, aguardando configuração)

**O que faz:** Para cada pedido PIX aprovado, cria um canal privado temporário no servidor onde admin e comprador combinam a entrega in-game. Canal é deletado quando o comprador confirma o recebimento. Só ocorre se o comprador tiver `discord_id` vinculado e as 3 variáveis de estrutura configuradas.

**Lifecycle:**
```
Pagamento PIX confirmado
  → cria canal #entrega-{orderId[0:8]} na categoria DISCORD_ORDERS_CATEGORY_ID
  → permissões: @everyone DENY, DISCORD_ADMIN_ROLE_ID ALLOW, comprador ALLOW
  → embed de abertura com itens, total e aviso de não compartilhar dados
  → discord_channel_id salvo em orders

Comprador clica "Confirmar recebimento" (/perfil → Últimos Pedidos)
  → POST /api/store/orders/[id]/confirm-delivery
  → orders.delivered_at preenchido
  → canal deletado automaticamente
  → alerta admin via webhook (alertItemEntregue)
```

**Funções em `discord-bot.ts`:**
- `createPrivateChannel` — cria o canal com permissões corretas e envia embed de abertura
- `deleteDiscordChannel` — deleta o canal (fire-and-forget)
- `embedCanalEntrega` — monta o embed de abertura

**Nova rota:** `src/app/api/store/orders/[id]/confirm-delivery/route.ts` (usa admin client, sem policy UPDATE para usuário autenticado em `orders`)

> Pedidos de pontos **não criam canal** — entrega é automática via sistema.

**Limitação atual:** só o comprador pode confirmar a entrega. Não existe override para admin confirmar manualmente caso o comprador não confirme.

---

## Melhorias opcionais (não implementadas)

Estas funcionalidades **não são necessárias** para o fluxo funcionar, mas melhorariam a experiência:

| Melhoria | Onde | Esforço |
|---|---|---|
| Badge "receberá notif. no Discord" no checkout | `/carrinho` | baixo |
| Sugestão de conectar Discord durante o checkout | `/carrinho` | baixo |
| Coluna Discord na tabela de pedidos do admin | `/admin/pedidos` | médio |
| DM ao comprador quando canal for criado (redundante com @ mention no canal) | `mercadopago/route.ts` | baixo |
| Override admin para confirmar entrega | `/admin/pedidos/[id]` | médio |

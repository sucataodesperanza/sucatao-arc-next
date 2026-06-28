# Sistema de Agendamento de Entrega — Contratos Sequenciais

## Visão Geral

Quando um usuário compra um contrato sequencial (diário/semanal/mensal), cada missão exige um **agendamento de entrega in-game** antes de ser confirmada pelo admin. Ao confirmar, o sistema credita a recompensa automaticamente (pontos → `profiles.points`, item → `user_inventory`).

---

## Fluxos

### Fluxo do Usuário

```
1. Compra o contrato sequencial (sucatas ou PIX)
        ↓
2. Missão 1 fica "ativa"
        ↓
3. Usuário vê botão "Agendar Entrega" na aba Contratos Ativos
        ↓
4. Clica → modal abre com:
   - Date picker (só datas futuras)
   - Grade de horários livres (baseado no horário de funcionamento do Sucatão)
   - Campo "Seu Game ID"
        ↓
5. Confirma → sistema cria contract_mission_schedules com status "scheduled"
        ↓
6. Card muda para "✓ Entrega agendada" com horário e Game ID
        ↓
7. No horário marcado, usuário encontra o Sucatão in-game para entregar o item
        ↓
8. Admin confirma no painel → recompensa liberada automaticamente
        ↓
9. Missão 2 fica "ativa" → volta ao passo 3
```

### Fluxo do Admin

```
1. Acessa /admin/contratos → seção "Agendamentos de Entrega" (topo da página)
        ↓
2. Visualiza tabela com todos os agendamentos scheduled/pending:
   - Usuário, Game ID, Contrato (tipo), Missão (recompensa), Horário, Prazo, Status
        ↓
3. No horário marcado, encontra o usuário in-game e recebe o item
        ↓
4. Clica "Confirmar" no painel
        ↓
5. Sistema executa automaticamente:
   a. Cria registro em user_mission_completions
   b. Credita points_reward em profiles.points (se > 0)
   c. Credita item_reward em user_inventory via catalog_items (se definido)
   d. Marca schedule como "confirmed"
        ↓
6. Próxima missão do usuário fica "ativa"
```

### Fluxo de Notificação por Email

```
1. Cron job externo chama POST /api/admin/contratos/schedules/notify-expiring
   (com header X-Cron-Secret = CRON_SECRET)
        ↓
2. Sistema busca contract_mission_schedules com:
   - status = "pending" (usuário ainda não agendou)
   - expires_at entre agora e +24h
        ↓
3. Se encontrar, envia email HTML via Resend para todos os admins
   (ADMIN_NOTIFICATION_EMAILS) com tabela de missões expirando
        ↓
4. Admins recebem o email e podem contatar os usuários ou aguardar agendamento
```

---

## Tabela `contract_mission_schedules`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → auth.users | Usuário que comprou o contrato |
| `group_id` | uuid FK → contract_groups | Contrato sequencial |
| `mission_id` | uuid FK → contract_group_missions | Missão a ser entregue |
| `scheduled_at` | timestamptz nullable | Horário escolhido pelo usuário |
| `game_id` | text nullable | ID do jogador para o admin encontrar in-game |
| `status` | text | `pending` \| `scheduled` \| `confirmed` \| `expired` \| `cancelled` |
| `expires_at` | timestamptz | Prazo para agendar (calculado na ativação da missão) |
| `confirmed_at` | timestamptz nullable | Quando o admin confirmou |
| `created_at` | timestamptz | — |

> UNIQUE `(user_id, mission_id)` — uma schedule por missão por usuário. Upsert ao re-agendar.

### Prazos por tipo de contrato

| Tipo | Prazo (desde ativação da missão) |
|---|---|
| `daily` | 1 dia |
| `weekly` | 7 dias |
| `monthly` | 30 dias |

O prazo começa quando a missão fica **ativa** (missão anterior confirmada, ou no momento da compra para a missão 1).

---

## Horários de Agendamento

Reutiliza o sistema de trades:
- **Fonte**: `trade_settings.operating_hours_start` / `operating_hours_end`
- **Endpoint**: `GET /api/trades/available-times?date=YYYY-MM-DD`
- **Conflito**: verifica `contract_mission_schedules.scheduled_at` com status ≠ cancelled/expired
- **Intervalo**: 5 minutos (definido em `trade_settings.slot_duration_minutes`)

---

## APIs

### Usuário

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/contratos/passes/missions/:id/schedule` | POST | Agendar entrega de uma missão |
| `/api/contratos/passes/missions/:id/schedule` | GET | Ver agendamento atual da missão |
| `/api/trades/available-times?date=YYYY-MM-DD` | GET | Horários livres (compartilhado com trades) |

**Body POST schedule:**
```json
{
  "scheduled_at": "2026-06-28T15:00:00",
  "game_id": "SucataoFan#1234"
}
```

**Validações:**
1. Missão pertence a um contrato que o usuário comprou
2. Missão está "ativa" (anterior concluída)
3. Horário não conflita com outro agendamento
4. Não expirou

### Admin

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/admin/contratos/schedules` | GET | Listar agendamentos scheduled/pending |
| `/api/admin/contratos/schedules/:id/confirm` | POST | Confirmar entrega e creditar recompensas |
| `/api/admin/contratos/schedules/notify-expiring` | POST | Disparar email de notificação (cron) |

**Resposta POST confirm:**
```json
{
  "ok": true,
  "points_credited": 150,
  "item_credited": "Módulos Exodus"
}
```

---

## Distribuição de Recompensas (ao confirmar)

```
Admin clica "Confirmar"
    ↓
user_mission_completions INSERT (se não existir)
    ↓
Se points_reward > 0:
    → profiles.points += points_reward
    ↓
Se item_reward != null:
    → busca catalog_items por nome (ILIKE)
    → user_inventory INSERT (addItemsToInventory com source="admin")
    ↓
contract_mission_schedules.status = "confirmed"
    confirmed_at = now()
    ↓
Próxima missão fica "active" automaticamente
```

---

## Frontend — Aba "Contratos Ativos"

O card da **Missão Atual** tem dois estados:

**Sem agendamento** (`schedule == null` ou `status != "scheduled"`):
- Botão **"Agendar Entrega"** (verde shimmer, classe `carrinho-checkout-btn`)
- Clica → modal com date picker + grade de horários + Game ID

**Com agendamento** (`schedule.status == "scheduled"`):
- Card verde com "✓ Entrega agendada"
- Horário formatado + Game ID registrado

---

## Admin — `/admin/contratos`

Seção **"Agendamentos de Entrega"** aparece no **topo da página** (antes de contratos individuais).

Tabela com colunas:
- **Usuário**: nome do perfil
- **Game ID**: ID in-game para localizar o jogador
- **Contrato**: tipo (DAILY/WEEKLY/MONTHLY) + título
- **Missão**: posição + título + recompensa (pts ou 🎁 item)
- **Horário**: scheduled_at formatado (vermelho se já passou)
- **Prazo**: expires_at (vermelho se expirado)
- **Status**: badge colorido
- **Ação**: botão "Confirmar" (só para `status = "scheduled"`)

---

## Notificação por Email (Resend)

### Variáveis de Ambiente

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@sucataosperanza.com.br
ADMIN_NOTIFICATION_EMAILS=admin1@email.com,admin2@email.com
CRON_SECRET=segredo_aleatorio_para_proteger_o_endpoint
```

### Configurar Cron (Vercel)

No `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/contratos/schedules/notify-expiring",
      "schedule": "0 * * * *"
    }
  ]
}
```

O cron deve enviar o header `X-Cron-Secret: <CRON_SECRET>` — no Vercel Cron, configurar via variável de ambiente no dashboard.

**Alternativa**: chamar manualmente ou via GitHub Actions se preferir.

---

## Casos de Borda

| Situação | Comportamento |
|---|---|
| Usuário re-agenda | Upsert em `contract_mission_schedules` (UNIQUE user_id+mission_id), `status` volta para `scheduled` |
| Admin confirma missão já concluída | Verifica `user_mission_completions` — não duplica, mas atualiza schedule para `confirmed` |
| Item do contrato não encontrado no catálogo | Log de erro, pontos ainda são creditados, item não vai ao inventário |
| Usuário não agendar antes do prazo | `status` continua `pending`, admin recebe email de notificação |
| Admin não confirmar após horário agendado | Horário fica marcado como "passado" (vermelho na tabela), admin ainda pode confirmar manualmente |
| Limite diário (weekly/monthly) | Implementado separadamente em `user_mission_completions` — 1 confirmação/dia por grupo |

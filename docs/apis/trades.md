# APIs — Trades

## Endpoints Públicos (usuário logado)

---

### `GET /api/trades`

Lista os trades ativos do Sucatão que ainda **não foram aceitos** por ninguém.

**Lógica de filtro:**
1. Busca todos os `trade_id` com aceitação ativa (status ≠ `cancelled`)
2. Exclui esses IDs da query de `trades`

**Resposta:**
```json
{
  "trades": [
    {
      "id": "uuid",
      "offer_points": 100,
      "want_item_name": "Injeção de Adrenalina",
      "want_item_qty": 1,
      "want_item_icon": "https://...",
      "want_item_rarity": "comum",
      "status": "active",
      "expires_at": "2026-07-01T00:00:00",
      "created_at": "2026-06-25T12:00:00"
    }
  ]
}
```

---

### `POST /api/trades/:id/accept`

Aceita um trade. Garante exclusividade — apenas **uma aceitação ativa** por trade.

**Autenticação:** Obrigatória

**Verificações em ordem:**
1. Trade existe e está `active`
2. Não existe nenhuma aceitação com status ≠ `cancelled` para este trade
3. Se existir e for do mesmo usuário → 409 `already_accepted`
4. Se existir e for de outro usuário → 409 `taken`

**Solicitação atual:** envia slot_id (identificador daily: retornado por GET /api/trades/slots) e game_id. O servidor relê configurações e reservas com acesso administrativo, sem expor identidades de outros clientes. Valida o horário futuro, a grade diária e a ocupação; grava status scheduled, scheduled_at e game_id com slot_id nulo para horários automáticos. IDs de janelas manuais antigas continuam aceitos quando ativos, futuros e com capacidade. Conflito de horário retorna 409; falha na consulta de agenda retorna 503.

**Resposta de sucesso:** `200 { ok: true }`

**Erros:**
| Status | Code | Causa |
|---|---|---|
| 401 | — | Não autenticado |
| 404 | — | Trade não encontrado ou inativo |
| 409 | `already_accepted` | Usuário já aceitou este trade |
| 409 | `taken` | Outro usuário já aceitou este trade |
| 500 | — | Erro de banco |

---

### `GET /api/trades/my`

Retorna todos os trades aceitos pelo usuário logado, com dados do trade embutidos.

**Resposta:**
```json
{
  "trades": [
    {
      "id": "uuid-acceptance",
      "status": "pending",
      "game_id": null,
      "created_at": "2026-06-25T12:00:00",
      "scheduled_at": null,
      "trades": {
        "id": "uuid-trade",
        "offer_points": 100,
        "want_item_name": "Injeção de Adrenalina",
        "want_item_qty": 1,
        "want_item_icon": "https://...",
        "want_item_rarity": "comum"
      }
    }
  ]
}
```

---

### `PATCH /api/trades/my/:id/schedule`

Agenda um horário de entrega in-game para uma aceitação.

**Autenticação:** Obrigatória

**Body:**
```json
{
  "scheduled_at": "2026-06-25T15:00:00",
  "game_id": "SucataoFan#1234"
}
```

**Verificações:**
1. Aceitação pertence ao usuário logado
2. Status ≠ `completed`
3. Não existe outro agendamento com o mesmo `scheduled_at` (exceto a própria)

**Efeito:** `status = "scheduled"`, `scheduled_at` e `game_id` salvos

**Resposta de sucesso:** `200 { ok: true }`

**Erros:**
| Status | Causa |
|---|---|
| 400 | `scheduled_at` ausente |
| 401 | Não autenticado |
| 404 | Aceitação não encontrada |
| 409 | Trade já concluído ou horário já ocupado |
| 500 | Erro de banco |

---

### `GET /api/trades/available-times?date=YYYY-MM-DD`

Retorna os horários disponíveis para agendamento em uma data específica.

**Lógica:**
1. Lê `trade_settings` para obter `operating_hours_start`, `operating_hours_end`, `slot_duration_minutes`
2. Gera todos os slots de 5 em 5 minutos dentro do intervalo
3. Exclui slots passados (antes de `now()`)
4. Exclui slots já agendados (`trade_acceptances.scheduled_at` com status ≠ `cancelled` na mesma data)

**Resposta:**
```json
{
  "times": ["09:00", "09:05", "09:10", "..."],
  "date": "2026-06-25"
}
```

---

## Endpoints Admin

---

### `GET /api/admin/trades/settings`

Retorna a configuração de horário de funcionamento.

**Resposta:**
```json
{
  "operating_hours_start": "09:00",
  "operating_hours_end": "00:00",
  "slot_duration_minutes": 5
}
```

---

### `PATCH /api/admin/trades/settings`

Atualiza o horário de funcionamento dos trades.

**Body (parcial):**
```json
{
  "operating_hours_start": "10:00",
  "operating_hours_end": "23:00"
}
```

**Resposta:** `200 { ok: true }`

---

### `GET /api/admin/trades/acceptances`

Lista todas as aceitações (status ≠ `cancelled`) com dados do trade e perfil do usuário.

**Resposta:**
```json
{
  "acceptances": [
    {
      "id": "uuid",
      "status": "scheduled",
      "game_id": "SucataoFan#1234",
      "created_at": "...",
      "scheduled_at": "2026-06-25T15:00:00",
      "user_id": "uuid",
      "profiles": { "name": "André Tavares" },
      "trades": {
        "id": "uuid",
        "offer_points": 100,
        "want_item_name": "Injeção de Adrenalina",
        "want_item_qty": 1
      }
    }
  ]
}
```

---

### `POST /api/admin/trades/acceptances/:id/complete`

Conclui um trade: credita os pontos ao usuário e marca como `completed`.

**Efeito:**
1. `trade_acceptances.status = "completed"`
2. `profiles.points += trades.offer_points`

**Resposta:** `200 { ok: true, points_credited: 100 }`

---

## Banco de Dados

### Tabela `trades`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `offer_points` | integer | Pontos que o Sucatão paga |
| `want_item_name` | text | Item que quer receber |
| `want_item_qty` | integer | Quantidade |
| `want_item_icon` | text | URL da imagem |
| `want_item_rarity` | text | Raridade do item |
| `status` | text | `active` / `inactive` |
| `expires_at` | timestamptz | Data de expiração |
| `created_at` | timestamptz | — |

### Tabela `trade_acceptances`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `trade_id` | uuid FK → trades | Trade aceito |
| `user_id` | uuid FK → auth.users | Quem aceitou |
| `status` | text | `pending` / `scheduled` / `completed` / `cancelled` |
| `game_id` | text | ID do jogador in-game |
| `scheduled_at` | timestamptz | Horário agendado (livre, verificado contra conflitos) |
| `created_at` | timestamptz | — |

> **Restrição de negócio:** Apenas UMA aceitação ativa (status ≠ `cancelled`) por `trade_id`. Verificada na API, não por constraint SQL.

### Tabela `trade_settings` (singleton)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer PK | Sempre 1 — única linha |
| `operating_hours_start` | text | Início do funcionamento (ex: `"09:00"`) |
| `operating_hours_end` | text | Fim (ex: `"00:00"`, pode passar da meia-noite) |
| `slot_duration_minutes` | integer | Intervalo entre slots (padrão: 5) |
| `updated_at` | timestamptz | — |

## Agenda automática — revisão de 20/10/2026

### GET /api/trades/slots

Consulta trade_settings e gera opções para hoje e os seis dias seguintes. Usa America/Cuiaba (UTC−4), respeita virada do dia e intervalos que atravessam meia-noite. Horários passados e instantes presentes em trade_acceptances com status diferente de cancelled são removidos. A leitura de reservas é paginada e administrativa para considerar todos os clientes, sem devolver seus dados.

Resposta: slots com id, label, scheduled_for (ISO UTC), capacity e booked. Os identificadores automáticos usam daily:<ISO>; não são UUIDs e não são gravados como chaves estrangeiras. Os horários são gravados no campo scheduled_at existente. Cache-Control: no-store. Falha de consulta retorna 503 com erro, nunca uma agenda vazia de sucesso.

O formulário atual utiliza este endpoint. GET /api/trades/available-times e PATCH /api/trades/my/:id/schedule são caminhos legados, não usados na seleção atual. Não é necessário popular trade_slots para a agenda diária; nenhum cadastro ou agendamento existente é removido.

Validação: node --test tests/trade-scheduling.test.cjs. Testes cobrem horários futuros sem janelas manuais, Cuiabá versus UTC, meia-noite, funcionamento noturno, ocupação por instante, configuração inválida, login e confirmação/rejeição sem criar solicitações reais.

O gerador aceita tanto HH:mm quanto HH:mm:00, formato retornado por campos time do PostgreSQL. O intervalo salvo é respeitado (por exemplo, 60 minutos); o painel mostra esse intervalo sem substituí-lo pelo padrão de 5.

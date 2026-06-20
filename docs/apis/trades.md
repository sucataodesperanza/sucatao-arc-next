# APIs — Trades

Documentação de todos os endpoints do sistema de trades.

---

## Públicas (usuário autenticado)

### `GET /api/trades`
Lista os trades com `status = active`.

**Response:**
```json
{ "trades": [{ "id", "offer_points", "want_item_name", "want_item_qty", "want_item_icon", "want_item_rarity", "status", "expires_at", "created_at" }] }
```

---

### `POST /api/trades/:id/accept`
Usuário aceita um trade. Cria entrada em `trade_acceptances` com `status = pending`.

**Erros:** `401` sem auth · `404` trade não encontrado/inativo · `409` já aceitou

---

### `GET /api/trades/my`
Retorna as aceitações do usuário logado com trade e slot associados.

**Response:**
```json
{ "trades": [{ "id", "status", "game_id", "created_at", "slot_id", "trade_slots": { "label", "scheduled_for" }, "trades": { ... } }] }
```

---

### `PATCH /api/trades/my/:id/schedule`
Usuário agenda um horário in-game para entregar o item.

**Body:** `{ slot_id: uuid, game_id: string }`

**Efeito:** `trade_acceptances.status` → `scheduled`, salva `slot_id` e `game_id`

**Erros:** `400` sem slot_id · `404` aceitação não encontrada · `409` slot lotado ou trade já concluído · `403` update bloqueado por RLS

---

### `GET /api/trades/slots`
Lista slots ativos com data futura e vagas disponíveis (filtra lotados automaticamente).

**Response:**
```json
{ "slots": [{ "id", "label", "scheduled_for", "capacity", "booked" }] }
```

---

## Admin

### `GET /api/admin/trades`
Lista todos os trades (qualquer status).

### `POST /api/admin/trades`
Cria um trade.
**Body obrigatório:** `offer_points` (number), `want_item_name` (string)
**Opcionais:** `want_item_qty`, `want_item_icon`, `want_item_rarity`, `status`, `expires_at`

### `PATCH /api/admin/trades/:id`
Edita campos de um trade. Aceita qualquer subconjunto dos campos.

### `DELETE /api/admin/trades/:id`
Remove um trade (cascata apaga `trade_acceptances` relacionadas).

---

### `GET /api/admin/trades/slots`
Lista todos os slots (incluindo inativos e passados).

### `POST /api/admin/trades/slots`
Cria um slot.
**Body:** `{ label, scheduled_for, capacity? }`

### `PATCH /api/admin/trades/slots/:id`
Edita slot (label, scheduled_for, capacity, active).

### `DELETE /api/admin/trades/slots/:id`
Remove slot. Aceitações com esse slot ficam com `slot_id = null`.

---

### `GET /api/admin/trades/acceptances`
Lista aceitações não canceladas com join de trades, trade_slots e profiles.

### `POST /api/admin/trades/acceptances/:id/complete`
Conclui um trade:
1. `trade_acceptances.status` → `completed`
2. `profiles.points += trades.offer_points` para o usuário

**Erro:** `409` se já concluído.

---

## Fluxo de Estados

```
aceito (pending)
    ↓  PATCH /api/trades/my/:id/schedule
agendado (scheduled)
    ↓  POST /api/admin/trades/acceptances/:id/complete
concluído (completed)  →  pontos creditados
```

# APIs — Inventário

Documentação dos endpoints do sistema de inventário do jogador.

---

## `GET /api/inventory`

Retorna o inventário completo do usuário logado.

**Auth:** Sim  
**Response:**
```json
{
  "items": [{ "id", "quantity", "acquired_at", "catalog_items": { "id", "name", "item_type", "rarity", "icon_url", "value", "weight_kg", "stack_size" } }],
  "capacity": 100,
  "used": 2
}
```

- `capacity` → `profiles.inventory_capacity` (padrão 100)
- `used` → soma de todas as `quantity`; quando `used >= capacity`, inventário está cheio

---

## `GET /api/inventory/history`

Retorna as 100 aquisições mais recentes do usuário.

**Auth:** Sim  
**Response:**
```json
{
  "history": [{ "id", "quantity", "source", "acquired_at", "catalog_items": { "id", "name", "item_type", "rarity", "icon_url", "value" } }]
}
```

**Valores de `source`:** `points` | `pix` | `trade` | `reconcile` | `admin` | `unknown`

---

## `POST /api/inventory/expand`

Compra um pacote de +25 slots de inventário.

**Auth:** Sim  
**Body:** `{ "mode": "points" | "cash" }`

### Modo pontos (funcional)
- Preço: `pacote_nº × 10.000` pts (1º=10k, 2º=20k, 3º=30k...)
- Debita pontos e incrementa `profiles.inventory_capacity` em +25

**Response:**
```json
{ "ok": true, "new_capacity": 125, "points_spent": 10000, "points_left": 40000 }
```

### Modo cash (placeholder — 501)
- Preço: `(floor(extra_slots/100) + 1) × R$5`
- Retorna 501 com mensagem de em breve

**Erros:** `401` sem auth · `409` pontos insuficientes

---

## `POST /api/inventory/reconcile`

Reconcilia o inventário com todas as compras pagas. Garante que nenhum item fique faltando.

**Auth:** Sim  
**Body:** nenhum

**Response:**
```json
{ "ok": true, "orders_processed": 3, "items_synced": 5 }
```

- Percorre todos os pedidos com `payment_status = "paid"`
- Chama `addItemsToInventory` (idempotente) para cada item
- **Chamado automaticamente** pela tela `/pedido-confirmado` ao montar (safety net após qualquer confirmação de compra)
- Disponível via botão "↻ Sincronizar com compras" no painel do inventário

---

## Fluxo completo

```
Compra com pontos → POST /api/store/checkout
  → addItemsToInventory(userId, items, "points") — imediato

Compra com PIX → POST /api/store/sync-payment (quando pending→paid)
  → addItemsToInventory(userId, items, "pix") — na primeira confirmação

Qualquer confirmação → GET /pedido-confirmado monta
  → POST /api/inventory/reconcile — background, safety net

Manual → botão "↻ Sincronizar"
  → POST /api/inventory/reconcile
```

---

## Utilitários

### `src/lib/inventory.ts`
- `addItemsToInventory(userId, items, source)` — upsert em `user_inventory` + insert em `inventory_history`

### `src/lib/inventory-pricing.ts`
- `nextPackPointsPrice(extraSlots)` — preço em pontos do próximo pacote
- `nextPackBrlPrice(extraSlots)` — preço em BRL do próximo pacote

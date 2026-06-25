# APIs — Inventário

Documentação dos endpoints do sistema de inventário do jogador.

---

## `GET /api/inventory`

Retorna o inventário completo do usuário logado.

**Auth:** Sim  
**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "quantity": 2,
      "acquired_at": "2026-06-24T...",
      "catalog_items": {
        "id": "item-id",
        "name": "Bigorna I",
        "item_type": "Hand Cannon",
        "rarity": "Uncommon",
        "icon_url": "https://...",
        "value": 5000,
        "weight_kg": 5,
        "stack_size": 1
      }
    }
  ],
  "capacity": 100,
  "used": 2
}
```

- `capacity`: slots totais do usuário (`profiles.inventory_capacity`, padrão 100)
- `used`: soma de todas as `quantity` — quando `used >= capacity`, inventário cheio

---

## `POST /api/inventory/expand`

Compra um pacote de +25 slots de inventário.

**Auth:** Sim  
**Body:** `{ "mode": "points" | "cash" }`

### Modo pontos
- Preço escalonado: pacote_nº × 10.000 pontos (1º=10k, 2º=20k, ...)
- Debita pontos e adiciona +25 a `profiles.inventory_capacity`

**Response (sucesso):**
```json
{
  "ok": true,
  "new_capacity": 125,
  "points_spent": 10000,
  "points_left": 40000
}
```

**Erros:** `401` sem auth · `404` perfil não encontrado · `409` pontos insuficientes

### Modo cash
- Placeholder (501) — PIX para slots de inventário em desenvolvimento
- Preço: `(floor(extra_slots/100) + 1) × R$5`

---

## `POST /api/inventory/reconcile`

Reconcilia o inventário com todas as compras pagas. Garante que nenhum item fique faltando mesmo que a adição automática tenha falhado.

**Auth:** Sim  
**Body:** nenhum

**Response:**
```json
{
  "ok": true,
  "orders_processed": 3,
  "items_synced": 5
}
```

- Percorre todos os pedidos com `payment_status = "paid"` do usuário
- Para cada item encontrado, chama `addItemsToInventory` (idempotente — não duplica)
- Chamado automaticamente pela tela de inventário quando `items.length === 0`

---

## Fluxo de adição automática ao inventário

```
Compra com pontos
  → POST /api/store/checkout
    → addItemsToInventory() ← imediato

Compra com PIX
  → POST /api/store/sync-payment (quando payment_status: "pending" → "paid")
    → addItemsToInventory() ← apenas na primeira confirmação
    
Recuperação retroativa
  → POST /api/inventory/reconcile
    → addItemsToInventory() para cada pedido pago ← idempotente
```

---

## Utilitários compartilhados

### `src/lib/inventory.ts`
- `addItemsToInventory(userId, items)` — upsert: insere ou incrementa `quantity`

### `src/lib/inventory-pricing.ts`
- `nextPackPointsPrice(extraSlots)` — preço em pontos do próximo pacote
- `nextPackBrlPrice(extraSlots)` — preço em BRL do próximo pacote

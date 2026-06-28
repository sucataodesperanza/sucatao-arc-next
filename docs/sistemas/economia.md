# Sistema Econômico do Sucatão

Baseado na **Especificação Técnica — Sistema de Importação e Base Econômica do Sucatão**.

---

## Arquitetura

```
MetaForge API
      ↓ (sincronização periódica — nunca em tempo real)
Supabase (banco local)
      ↓
Sucatão
```

**Princípio:** o Sucatão nunca consulta a API MetaForge diretamente para exibir informações ao usuário. A API serve apenas como **fonte de sincronização**. Toda a lógica de valor, economia e precificação é exclusiva do Sucatão.

---

## Fases Implementadas

### Phase 2 — Dados do MetaForge

| Tabela | Fonte | Sync |
|---|---|---|
| `catalog_items` | MetaForge `/api/arc-raiders/items` | `POST /api/admin/catalog/sync` |
| `arcs` | MetaForge `/api/arc-raiders/arcs` | `POST /api/admin/arcpedia/sync` |
| `game_traders` | MetaForge `/api/arc-raiders/traders` | `POST /api/admin/economia/sync-traders` |
| `game_quests` | MetaForge `/api/arc-raiders/quests` | `POST /api/admin/economia/sync-quests` |

> Estratégia: **upsert** (insere novos, atualiza existentes, **nunca deleta**)

### Phase 3 — Base Econômica Exclusiva

- `economy_logs` — log de toda movimentação econômica
- `item_economics` — métricas e VEI por item
- `lib/vei.ts` — cálculo do VEI
- `lib/economy.ts` — utilitário `logEconomy()`

### Phase 4 — Automação

- Cron diário às 03:00 BRT (06:00 UTC): sync itens + traders + quests + recálculo VEI
- `vercel.json` com configuração dos crons

---

## Tabelas do Banco

### `game_traders`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | text PK | Slug do trader (ex: `apollo`) |
| `name` | text | Nome do trader (ex: `Apollo`) |
| `items` | jsonb | Array de itens vendidos `[{name, value, rarity, trader_price, item_type, ...}]` |
| `synced_at` | timestamptz | Último sync |

> Formato da API MetaForge: `{ data: { "NomeTrader": [...itens], ... } }` — objeto com trader name como chave.

### `game_quests`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | text PK | ID da quest |
| `name` | text | Nome |
| `description` | text | Descrição |
| `required_items` | jsonb | `[{itemId, qty}]` |
| `reward` | jsonb | `{xp, items[], currency}` |
| `difficulty` | text | Dificuldade |
| `synced_at` | timestamptz | Último sync |

### `economy_logs`

Log completo de **toda movimentação econômica** do Sucatão.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `player_id` | uuid FK | Usuário |
| `action` | text | `buy` \| `sell` \| `trade` \| `reward` \| `earn` \| `spend` |
| `value` | numeric(12,2) | Valor da transação |
| `currency` | text | `points` \| `cash` |
| `item_id` | text FK nullable | Item envolvido |
| `item_qty` | integer | Quantidade |
| `source` | text | `shop` \| `trade` \| `contract` \| `auction` \| `lottery` \| `inventory` \| `reward` \| `admin` |
| `source_id` | text nullable | ID da entidade de origem (order_id, trade_id, etc.) |
| `metadata` | jsonb nullable | Dados extras |
| `created_at` | timestamptz | — |

**Onde é registrado atualmente:**
- Compra na loja com pontos → `action: buy, source: shop`
- Conclusão de contrato → `action: reward, source: contract`

**Onde registrar futuramente:**
- Trades aceitos → `source: trade`
- Leilões → `source: auction`
- Sorteios → `source: lottery`
- Recompensas de facção → `source: reward`

### `item_economics`

Métricas econômicas calculadas pelo Sucatão (não vêm da API).

| Campo | Tipo | Descrição |
|---|---|---|
| `item_id` | text PK FK → catalog_items | — |
| `vei` | numeric(10,4) | Valor Econômico do Item (0-100) |
| `market_price` | numeric(10,2) | Preço médio de mercado |
| `average_trade_price` | numeric(10,2) | Preço médio nos trades |
| `trade_count` | integer | Total de negociações |
| `weekly_demand` | integer | Negociações na última semana |
| `weekly_supply` | integer | Oferta semanal |
| `liquidity_score` | numeric(5,2) | Liquidez (0-100) |
| `contract_frequency` | integer | Aparições em contratos |
| `auction_frequency` | integer | Aparições em leilões |
| `favorites` | integer | Favoritos |
| `views` | integer | Visualizações |
| `watchlist_count` | integer | Watchlist |
| `last_calculated_at` | timestamptz | Último cálculo de VEI |

---

## VEI — Valor Econômico do Item

Índice exclusivo do Sucatão que mede o valor estratégico de cada item. Escala **0 a 100**.

### Fórmula Atual

```
VEI = (sellValue_normalizado × 0.5) + (rarity_score × 0.3) + (category_score × 0.2)
```

#### Pesos de Raridade (0–10)

| Raridade | Score |
|---|---|
| Common | 1 |
| Uncommon | 3 |
| Rare | 5 |
| Epic | 7 |
| Legendary | 10 |

#### Pesos de Categoria (0–10)

| Categoria | Score |
|---|---|
| weapon / Weapon | 10 |
| consumable / Consumable | 8 |
| tool / Tool | 6 |
| armor / Armor | 4 |
| material / Material | 3 |
| misc / Misc | 1 |

#### Normalização do Valor de Venda

`sellValue_normalizado = min(1, sellValue / 50000) × 10` → 0 a 10

#### Liquidity Score

`liquidity_score = min(100, trade_count × 0.5 + weekly_demand × 2)`

### Fórmula Futura (Phase 4 avançada)

- quantidade negociada
- procura / oferta
- tempo médio para vender
- uso em crafting e quests
- popularidade / views

---

## APIs

### Sincronização (admin)

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/admin/catalog/sync` | POST | Sync itens do MetaForge |
| `/api/admin/economia/sync-traders` | POST | Sync traders do MetaForge |
| `/api/admin/economia/sync-quests` | POST | Sync quests do MetaForge |
| `/api/admin/economia/recalc-vei` | POST | Recalcula VEI de todos os itens |
| `/api/cron/daily-sync` | GET | Cron: executa todos os syncs em sequência |

### Utilitários (código)

```ts
// lib/economy.ts
await logEconomy({
  player_id: userId,
  action:    "buy",          // buy | sell | trade | reward | earn | spend
  value:     500,
  currency:  "points",       // points | cash
  item_id:   "item-123",
  item_qty:  1,
  source:    "shop",         // shop | trade | contract | auction | ...
  source_id: orderId,
})
```

```ts
// lib/vei.ts
const vei = calcVei(item.value, item.rarity, item.item_type)
// → número entre 0 e 100
```

---

## Cron Jobs (`vercel.json`)

| Schedule | Endpoint | Descrição |
|---|---|---|
| `0 6 * * *` | `/api/cron/daily-sync` | 03:00 BRT — sync completo + recálculo VEI |
| `0 * * * *` | `/api/admin/contratos/schedules/notify-expiring` | A cada hora — email de contratos expirando |

**Autenticação do cron:** header `Authorization: Bearer <CRON_SECRET>` (variável de ambiente).

---

## Admin `/admin/economia`

Painel com:
- **Stats**: total de logs, jogadores únicos, volume total de pontos movimentados
- **Top 20 VEI**: itens com maior valor econômico, com trade_count, weekly_demand e liquidity_score
- **Logs recentes**: últimas 30 movimentações com usuário, ação, source e valor
- **Botões de sync**: Sync Traders, Sync Quests, Recalcular VEI, Sync Itens

---

---

## Sistema de Precificação VEI

### Tabela `economy_settings` (singleton)

| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `points_multiplier` | numeric(10,4) | 100 | VEI × mult = preço em pontos |
| `cash_multiplier` | numeric(10,4) | 0.10 | VEI × mult = preço em R$ |

**Exemplo:** VEI 80 × 100 = 8.000 pts · VEI 80 × 0.10 = R$ 8,00

### Campos adicionados em `stock_items`

| Campo | Tipo | Descrição |
|---|---|---|
| `price_points` | integer | Preço em pontos (gerado pelo VEI, editável pelo admin) |
| `price_cash` | numeric(10,2) | Preço em R$ (gerado pelo VEI, editável pelo admin) |

### Fluxo de precificação

```
Novo item no estoque (POST /api/admin/stock)
    ↓
lib/pricing.ts → calcItemPrice(itemId)
    ↓
Busca VEI em item_economics
    ↓
price_points = round(vei × points_multiplier)
price_cash   = round(vei × cash_multiplier, 2)
    ↓
Salvo em stock_items (admin pode sobrescrever)
```

### Checkout atualizado

O checkout usa `price_points` do estoque quando disponível. Fallback: `value × 24` (sistema antigo).

### Utilitário `lib/pricing.ts`

```ts
const { price_points, price_cash, vei } = await calcItemPrice(itemId)
// ou com multiplicadores explícitos:
const pricing = await calcItemPrice(itemId, { points_multiplier: 150, cash_multiplier: 0.15 })
```

### APIs de precificação

| Endpoint | Método | Descrição |
|---|---|---|
| `/api/admin/economia/settings` | GET | Busca multiplicadores atuais |
| `/api/admin/economia/settings` | PATCH | Atualiza `points_multiplier` e `cash_multiplier` |
| `/api/admin/stock/bulk-add` | POST | Adiciona TODOS os catalog_items ao estoque com preços VEI |
| `/api/admin/stock/apply-vei` | POST | Aplica preços VEI a itens já no estoque (todos ou subset) |
| `/api/admin/economia/vei-list` | GET | Lista VEI de todos os itens para análise |

### Admin `/admin/precos`

Tela dedicada para análise e gestão de preços:
- **Configuração de multiplicadores** com preview ao vivo ("VEI 80 × 100 = 8.000 pts")
- **Botão "Add Todos ao Estoque"** — insere todos os `catalog_items` ativos com preços VEI
- **Botão "Aplicar VEI a Todos"** — recalcula preços de todos os itens já no estoque
- **Seleção múltipla** com "Aplicar VEI aos selecionados"
- **Distribuição por raridade e categoria** (contagem visual)
- **Tabela** com: nome, ícone, raridade, tipo, VEI, preço pts atual (editável inline), preço pts sugerido, delta %, preço R$ atual (editável), preço R$ sugerido
- **Filtros**: busca por nome, raridade, categoria, faixa de VEI (baixo/médio/alto)

### Sequência de setup inicial

```
1. /admin/economia → "Recalcular VEI"  (popula item_economics)
2. /admin/precos   → "Add Todos ao Estoque"  (insere itens + preços)
3. /admin/precos   → Ajustar multiplicadores se necessário
4. /admin/precos   → "Aplicar VEI a Todos" se ajustou multiplicadores
```

---

## Roadmap Futuro

| Feature | Fase | Descrição |
|---|---|---|
| Geração automática de contratos | Phase 4 | Contratos baseados no VEI e demanda dos itens |
| Recomendações de trades | Phase 4 | Sugestões baseadas em supply/demand e VEI |
| `weekly_supply` | Phase 4 | Calcular oferta real de itens via economy_logs |
| `market_price` | Phase 4 | Média dos preços de negociação |
| Indicadores de liquidez dinâmicos | Phase 4 | Recálculo automático conforme transações acontecem |
| `logEconomy` em trades aceitos | Pendente | Integrar hook nos trades do Sucatão |
| `logEconomy` em leilões | Pendente | Quando leilões forem implementados |
| `logEconomy` em sorteios | Pendente | Quando sorteios forem implementados |

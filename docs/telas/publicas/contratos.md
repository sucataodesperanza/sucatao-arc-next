# Contratos

**Rota:** `/contratos`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de contratos do Sucatão com dois sistemas distintos:
1. **Contratos individuais** — criados pelo admin, aceitos por usuários (aba "Contratos à Venda")
2. **Contratos sequenciais** — sequências de missões diárias/semanais/mensais com compra por pontos ou PIX (abas "Contratos à Venda" e "Contratos Ativos")

## Abas

| Aba | Status | Fonte |
|---|---|---|
| Contratos à Venda | ✅ Dinâmico | `contracts` + `contract_groups` + `user_contract_group_purchases` |
| Contratos Ativos | ✅ Dinâmico | `user_contract_group_purchases` + `contract_group_missions` + `user_mission_completions` |
| Histórico | ⚠️ Estático | Hardcoded |

---

## Aba "Contratos à Venda"

Exibe dois tipos de card usando o mesmo estilo `cv-card`:

### Contratos individuais (tabela `contracts`)
- Tipo, tier, título, objetivo, progresso, recompensas, expiração, taxa de sucesso
- Variantes visuais: `dourada`, `holografica`, `corrompida`
- **Modal de detalhes**: story, localização, sub-objetivos, inimigos, bônus
- **Botão ACEITAR** → cria `user_contract` com status `active`
- Após aceitar: "Em progresso" ou "Concluído"
- Progresso atualizado manualmente pelo admin; `profiles.points += sucatas` ao concluir

### Contratos sequenciais (tabela `contract_groups`)
- Badge de tipo: Diário (1 missão) · Semanal (7 missões) · Mensal (30 missões)
- Tier mostra count de missões
- Progresso: `missões_concluídas / total`
- Expiração em countdown
- **Botão ACEITAR** (gradiente verde + shimmer) → abre modal de 2 etapas:
  - **Etapa 1**: escolha de pagamento (Sucatas ou PIX)
  - **Etapa 2**: confirmação com resumo (nome, tipo, missões, valor, saldo atual → saldo após compra)
- Após compra: badge "ATIVO" + botão "Ver Meu Contrato"

---

## Aba "Contratos Ativos"

Lista de contratos sequenciais comprados pelo usuário.

### Layout de cada contrato

**Header cinematográfico:**
- Imagem de fundo com `brightness(0.35)` + gradiente overlay
- Badge de tipo colorido + título + contador `X/Y concluídas` + `Expira em`
- Barra de progresso geral na base do header

**Trilha de missões:**
- Nós de 76px, todos do mesmo tamanho
- **Missão de pontos**: valor dentro do círculo (ex: `+10`)
- **Missão de item**: imagem do catalog_item dentro do círculo (44px) + borda na cor da raridade
- **Nó ativo**: animação `node-pulse` (glow pulsante contínuo)
- **Nó concluído**: ✓ na cor do nó
- **Nó bloqueado**: opacity 25%, grayscale
- Conectores de 6px com margem de 24px de cada lado
- Abaixo de cada nó: `Dia 1`, `Dia 2`...
- **Mensal (30 missões)**: carrossel horizontal com drag-to-scroll

**Card "Missão Atual":**
- Badge: tipo + "Missão X/Y" + "Contrato expira em Xd"
- Título da missão
- Barra de progresso `0 / total`
- Descrição da missão (abaixo da barra)
- Recompensa: pts + item (se houver)
- **Bloqueado por limite diário**: card 🔒 com countdown até meia-noite BRT
- **Todas concluídas**: 🏆 mensagem

### Limite diário (semanal e mensal)
- Máximo **1 missão por dia** por contrato (calendário BRT = UTC-3)
- Verificado tanto no servidor (`POST .../complete` retorna 429) quanto no frontend (countdown)
- Contratos diários (1 missão) não têm essa restrição

---

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Endpoint |
|---|---|---|
| Contratos individuais à venda | `contracts` | `GET /api/contratos` |
| Progresso do usuário (individuais) | `user_contracts` | incluso em `GET /api/contratos` |
| Aceitar contrato individual | `user_contracts` | `POST /api/contratos/:id/accept` |
| Contratos sequenciais à venda | `contract_groups` (faction_id IS NULL) | `GET /api/contratos/passes` |
| Comprar com sucatas | `user_contract_group_purchases` + `profiles.points` | `POST /api/contratos/passes/:id/buy` |
| Comprar com PIX | `orders` + Mercado Pago | `POST /api/contratos/passes/:id/buy` (mode: cash) |
| Meus contratos sequenciais | `user_contract_group_purchases` + missões + conclusões | `GET /api/contratos/passes/meus` |
| Saldo de pontos (modal confirmação) | `profiles.points` | `GET /api/profile/points` |
| Imagem do contrato | Storage `contract-images` ou `/assets/bots/` | `contracts.image_url` |
| Sucatas do usuário (painel) | `profiles.points` | `GET /api/profile/points` |
| Resumo do Histórico (painel) | `user_contracts` | `GET /api/contratos/stats` |
| Meus Contratos (painel) | `user_contract_group_purchases` + missões | `GET /api/contratos/passes/meus` (já carregado) |
| Próximas Recompensas (painel) | **Hardcoded** | — |

---

## Painel Lateral

| Bloco | Status | Fonte |
|---|---|---|
| **Sucatas** — saldo real + barra de % concluídos | ✅ Real | `profiles.points` + `user_contracts` |
| **Meus Contratos** — lista os contratos sequenciais ativos do usuário | ✅ Real | `user_contract_group_purchases` + missões |
| **Resumo do Histórico** (aba Histórico) — concluídos, falhos, taxa de sucesso, sucatas | ✅ Real | `user_contracts` via `GET /api/contratos/stats` |
| **Progresso de Reputação** — nível, barra REP | ⚠️ Decorativo | — |
| **Próximas Recompensas** — itens por threshold de REP | ⚠️ Decorativo | — |

### `GET /api/contratos/stats`

Retorna estatísticas do usuário calculadas de `user_contracts`:

```json
{
  "completed": 5,
  "failed": 2,
  "expired": 1,
  "total": 8,
  "success_rate": 71
}
```

`success_rate = completed / (completed + failed) × 100`. Se nenhum decisivo, retorna 0.

---

## Tabelas do banco

### `contracts` (contratos individuais)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `type` | text | `Principal` \| `Secundário` \| `Diário` \| `Facção` |
| `tier` | text | `Básico` \| `Avançado` \| `Épico` \| `Lendário` |
| `title` | text | Título exibido no card |
| `description` | text | Descrição curta |
| `story` | text | Texto longo na modal |
| `image_url` | text | URL da imagem |
| `objective` | text | Resumo do objetivo |
| `total` | integer | Meta para completar |
| `sucatas` | integer | Pontos creditados ao concluir |
| `xp` / `rep` | integer | Exibidos, não creditados automaticamente |
| `rewards` / `objectives` / `enemies` | jsonb | Arrays de dados para a modal |
| `faction_id` | uuid FK nullable | Facção vinculada (null = geral) |
| `active` | boolean | false = oculto para usuários |

### `contract_groups` (passes sequenciais)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `faction_id` | uuid FK nullable | null = passe geral; vinculado = exclusivo da facção |
| `title` | text | — |
| `description` | text | — |
| `type` | text | `daily` \| `weekly` \| `monthly` |
| `starts_at` | timestamptz | Início do período |
| `expires_at` | timestamptz | Fim do período |
| `price_points` | integer | Custo em sucatas (0 = gratuito) |
| `price_real` | numeric(10,2) | Custo em R$ (0 = sem PIX) |
| `image_url` | text | Imagem de fundo do card/header |
| `active` | boolean | — |

### `contract_group_missions` (missões sequenciais)
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `group_id` | uuid FK | Contrato pai |
| `position` | integer | 1-based, ordem sequencial (`Dia 1`, `Dia 2`...) |
| `title` | text | — |
| `description` | text | Exibida abaixo da barra de progresso |
| `total` | integer | Meta para completar |
| `points_reward` | integer | Sucatas creditadas ao completar (0 em missões de item) |
| `item_reward` | jsonb nullable | `{item_name, item_image, item_rarity, item_qty}` |

> `item_reward` preenchido = missão de item (imagem no círculo, borda na cor da raridade). UNIQUE `(group_id, position)`.

### `user_mission_completions`
| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | uuid FK | — |
| `group_id` | uuid FK | — |
| `mission_id` | uuid FK | Missão concluída |
| `points_credited` | integer | Pontos creditados |
| `completed_at` | timestamptz | — |

> UNIQUE `(user_id, mission_id)` — cada missão só pode ser concluída uma vez por usuário.

### `user_contract_group_purchases`
| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | uuid FK | — |
| `group_id` | uuid FK | Contrato sequencial comprado |
| `payment_method` | text | `points` \| `pix` |
| `order_id` | uuid FK nullable | Referência ao pedido PIX |
| `purchased_at` | timestamptz | — |

> UNIQUE `(user_id, group_id)` — usuário não pode comprar o mesmo contrato duas vezes.

## Regras de Negócio

- **Contratos individuais**: 1 aceitação por usuário, progresso atualizado manualmente pelo admin
- **Contratos sequenciais**: compra com sucatas (imediata) ou PIX (via `/pagar/:id`, ativado no webhook)
- **Limite diário**: weekly e monthly = máximo 1 missão completada por dia por contrato (BRT meia-noite)
- **Sequencial**: missão N só disponível após N-1 concluída
- **Item rewards**: creditados visualmente; borda na cor da raridade (`icon_url` do `catalog_items`)
- **Contratos sequenciais de facção** (`faction_id != null`): aparecem apenas em `/faccoes/visao-geral` aba Recompensas
- **Contratos sequenciais gerais** (`faction_id IS NULL`): aparecem em `/contratos` aba Contratos à Venda

# Loja do Sucatão

**Rota:** `/loja`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Loja principal do site. Exibe itens do catálogo ARC Raiders à venda e itens de recompensa especiais (gift cards, merch, sorteios) gerenciados pelo admin.

## Conteúdo Visível

### Aba Destaques (padrão)
- Banner hero com imagem de fundo e chamada para ação
- **Itens em destaque** — grid de até 5 itens do catálogo (`catalog_items` com `featured = true`)
- Cards de categorias do site

### Aba Itens
- Filtros: busca por nome, raridade, tipo, ordenação e filtro por drops de bots
- Grid paginado de todos os itens com modal de detalhe

### Demais abas
- Passes, Sorteios, Serviços, Gift Cards — **Em breve** (placeholder)

### Painel lateral
- Header do usuário (avatar, nome, saldo de pontos), reputação e badge Mercador
- **Destaques da semana** — itens de recompensa gerenciados pelo admin (`reward_items` com `featured = true`); timer de countdown até o `expires_at` mais próximo

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens em destaque (grid principal) | `stock_items` + `catalog_items` | `featured`, `name`, `icon_url`, `rarity`, `item_type`, `value` | `GET /api/catalog` |
| Grid de itens (aba Itens) | `stock_items` + `catalog_items` | todos os campos | `GET /api/catalog` |
| **Destaques da semana** (painel) | `reward_items` | `id`, `name`, `image_url`, `price`, `stock`, `expires_at` | `GET /api/loja/weekly` (filtra `featured = true` e `active = true`) |
| Pontos do usuário | `profiles` | `points` | `supabase.from("profiles").select("points")` |
| Avatar e nome | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |
| Drops dos bots (filtro ARC Intel) | `arc-data.js` (local) | `bots[].drops`, `bots[].name` | — |

## Lógica dos Destaques

**Grid principal** (`catalog_items`):
1. Itens com `stock_items.featured = true` primeiro
2. Complemento com os de maior valor até totalizar 5

**Destaques da semana** (`reward_items`, painel lateral):
- Todos com `featured = true` e `active = true`
- Timer calculado dinamicamente: countdown para o menor `expires_at` entre os itens em destaque
- Sem `expires_at` → timer não aparece
- Gerenciados em `/admin/recompensas`

## Diferença entre tipos de itens

| Tipo | Tabela | Exemplos | Gerenciado em |
|---|---|---|---|
| Itens ARC (jogo) | `catalog_items` | Armas, materiais, equipamentos | `/admin/catalogo` + MetaForge sync |
| Itens de recompensa | `reward_items` | Gift cards, merch, sorteios | `/admin/recompensas` |

## Estados Especiais

- **Sem login**: botões de compra levam para `/login`
- **Carregando**: skeleton cards enquanto a API retorna
- **Sem destaques de recompensa**: seção "Destaques da semana" mostra "Nenhum destaque no momento."

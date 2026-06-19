# Loja do Sucatão

**Rota:** `/loja`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Loja principal do site. Exibe itens do catálogo à venda, com destaque para os itens marcados como "featured" pelo admin. Permite compra com pontos ou saldo real.

## Conteúdo Visível

### Aba Destaques (padrão)
- Banner hero com imagem de fundo (The Queen) e chamada para ação
- **Itens em destaque** — grid de até 5 itens: imagem, badge de raridade, nome, tipo, bancada e botão de compra
- Cards de categorias do site

### Aba Itens
- Filtros: busca por nome, raridade, tipo, ordenação e filtro por drops de bots
- Grid paginado de todos os itens do catálogo com modal de detalhe

### Demais abas
- Passes, Sorteios, Serviços, Gift Cards — todas **Em breve** (placeholder)

### Painel lateral
- Header do usuário (avatar, nome, saldo de pontos)
- Painel de reputação e badge Mercador
- Destaques da semana (hardcoded): Gift Card Digital, Camiseta Sucatão

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens em destaque | `stock_items` + `catalog_items` | `featured`, `name`, `icon_url`, `rarity`, `item_type`, `value` | `GET /api/catalog` |
| Grid de itens (aba Itens) | `stock_items` + `catalog_items` | todos os campos | `GET /api/catalog` |
| Pontos do usuário | `profiles` | `points` | `supabase.from("profiles").select("points").eq("id", user.id)` |
| Avatar e nome | `profiles` + `auth` | `avatar_url`, `user.user_metadata.name` | `supabase.auth.getUser()` + `profiles` |
| Destaques da semana | **Hardcoded** | — | — |
| Drops dos bots (filtro) | `arc-data.js` (local) | `bots[].drops`, `bots[].name` | — |

## Lógica de Destaque

Os itens exibidos no grid "Itens em destaque" seguem esta ordem de prioridade:
1. Itens com `stock_items.featured = true` (marcados pelo admin)
2. Complemento com os itens de maior valor até totalizar 5 cards

## Estados Especiais

- **Sem login**: botões de compra levam para `/login`
- **Carregando**: skeleton cards são exibidos enquanto a API retorna
- **Sem estoque**: cards com quantidade zero não impedem a exibição; o controle de estoque ocorre no checkout

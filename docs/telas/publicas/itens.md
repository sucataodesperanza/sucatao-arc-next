# Itens

**Rota:** `/itens`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Catálogo completo de itens do jogo sincronizados via MetaForge. Exibe todos os itens ativos com filtros avançados e integração com ARC Intel para mostrar quais bots droppam cada item.

## Conteúdo Visível

- **Barra de busca + filtros** — busca por nome, filtro por raridade, tipo e bot (ARC Intel)
- **Ordenação** — por valor (maior/menor), raridade ou nome
- **Grid de cards de itens** — imagem, badge de raridade, nome, tipo, valor; botão adicionar ao carrinho
- **Modal de detalhe** — imagem, raridade, nome, tipo, descrição, peso, stack, valor; botão comprar
- **Painel lateral** — header do usuário, seção ARC Intel (bots que droppam itens do tipo filtrado)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Todos os itens do catálogo | `catalog_items` (via `stock_items`) | `id`, `name`, `item_type`, `rarity`, `icon_url`, `description`, `weight_kg`, `stack_size`, `value` | `GET /api/catalog` |
| ARC Intel (bots no painel) | `arc-data.js` (local) | `bots[].name`, `.drops`, `.image`, `.threat` | — |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |
| Pontos do usuário | `profiles` | `points` | `supabase.from("profiles").select("points").eq("id", user.id)` |

## Notas

> A tela `/itens` e a aba "Itens" da `/loja` usam o mesmo hook `useItemsCatalog` e o mesmo endpoint `GET /api/catalog`, que retorna apenas itens com entrada em `stock_items` (à venda). Itens sem estoque não aparecem.

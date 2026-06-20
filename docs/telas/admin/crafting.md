# Admin — Crafting

**Rota:** `/admin/crafting`  
**Requer autenticação:** Sim (admin)

## Descrição

Editor de informações de crafting para qualquer item do catálogo. Permite cadastrar receitas, fontes, resultados de reciclagem e quais craftáveis usam cada material.

## Conteúdo Visível

- **Filtros** — por categoria (Todos / Materiais / Craftáveis) + busca por nome
- **Tabela** — imagem, nome, tipo, bancada, quantidade de campos preenchidos; clique abre modal
- **Modal de edição** — editor por seção com linhas `qtd × nome` (autocomplete dos itens do catálogo):
  - **Receita de crafting** (só para itens com bancada) — ingredientes necessários
  - **Pode ser obtido de** — itens fontes com quantidade
  - **Reciclado em** — itens gerados ao reciclar
  - **Recuperado em** — itens gerados ao recuperar/salvar
  - **Usado na fabricação de** — lista de nomes (sem quantidade) dos craftáveis que usam este item

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de itens | `catalog_items` | `id`, `name`, `item_type`, `rarity`, `workbench`, `icon_url`, `recipe`, `obtained_from`, `recycled_into`, `recovered_into`, `used_in_crafting` | `GET /api/admin/crafting/items?category=...&q=...` |
| Autocomplete de nomes | `catalog_items` | `name` | `GET /api/admin/crafting/items?category=all` (carregado uma vez) |
| Salvar todos os campos | `catalog_items` | `recipe`, `obtained_from`, `recycled_into`, `recovered_into`, `used_in_crafting` | `PATCH /api/admin/catalog/:id` |

## Estrutura dos Campos no Banco

| Campo | Tipo | Formato |
|---|---|---|
| `recipe` | `jsonb` | `[{ qty: number, name: string }]` |
| `obtained_from` | `jsonb` | `[{ qty: number, name: string }]` |
| `recycled_into` | `jsonb` | `[{ qty: number, name: string }]` |
| `recovered_into` | `jsonb` | `[{ qty: number, name: string }]` |
| `used_in_crafting` | `text[]` | `["Nome do craftável", ...]` |

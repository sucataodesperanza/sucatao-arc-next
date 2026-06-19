# Admin — Estoque

**Rota:** `/admin/estoque`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento do estoque da loja. Define quais itens do catálogo estão à venda, com preço, quantidade e flag de destaque.

## Conteúdo Visível

- **Busca + botão "Adicionar item ao estoque"**
- **Tabela paginada** — imagem, nome, tipo, raridade, valor (editável inline), quantidade (editável inline), toggle destaque, botão remover
- **Modal de adição** — busca no catálogo completo, lista paginada de itens disponíveis (excluindo os já no estoque)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens em estoque | `stock_items` + `catalog_items` (join) | `catalog_item_id`, `value`, `quantity`, `featured`, `name`, `item_type`, `rarity`, `icon_url` | `GET /api/admin/stock?page&pageSize&q` |
| Itens disponíveis para adicionar | `catalog_items` (exceto os já no estoque) | `id`, `name`, `item_type`, `rarity`, `icon_url` | `GET /api/admin/stock/available?page&pageSize&q` |
| Adicionar ao estoque | `stock_items` | `catalog_item_id`, `value`, `quantity`, `featured` | `POST /api/admin/stock` |
| Editar valor/quantidade/destaque | `stock_items` | `value`, `quantity`, `featured` | `PATCH /api/admin/stock/:catalog_item_id` |
| Remover do estoque | `stock_items` | — | `DELETE /api/admin/stock/:catalog_item_id` |

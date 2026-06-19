# Admin — Loot Boxes

**Rota:** `/admin/loot-boxes`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento das loot boxes disponíveis na loja. Permite configurar recompensas, taxas de drop por raridade e preços.

## Conteúdo Visível

- **Stats** — loot boxes ativas / total, total de aberturas, receita total
- **Tabela** — imagem, nome, preço, raridade, vezes aberta, receita, status, ações (editar/remover)
- **Modal criar/editar**:
  - Nome, preço, URL da imagem, raridade, status, descrição
  - Recompensas possíveis (uma por linha)
  - Taxas de drop por raridade (slider + campo numérico, devem somar 100%)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de loot boxes | `loot_boxes` | `id`, `name`, `price`, `rarity`, `image_url`, `description`, `rewards`, `drop_rates`, `times_opened`, `revenue`, `active` | `GET /api/admin/loot-boxes` |
| Criar | `loot_boxes` | todos os campos | `POST /api/admin/loot-boxes` |
| Editar/status | `loot_boxes` | campos editados | `PATCH /api/admin/loot-boxes/:id` |
| Remover | `loot_boxes` | — | `DELETE /api/admin/loot-boxes/:id` |

# Admin — Catálogo

**Rota:** `/admin/catalogo`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento do catálogo de itens sincronizados via MetaForge. Permite ativar/desativar itens e sincronizar com a API externa.

## Conteúdo Visível

- **Busca + filtros** — por nome, raridade e tipo
- **Botão "Sincronizar com MetaForge"** — dispara o sync e exibe resultado (itens atualizados / traduzidos)
- **Tabela paginada** — imagem, nome, tipo, raridade, toggle ativo/inativo

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de itens | `catalog_items` | `id`, `name`, `item_type`, `rarity`, `icon_url`, `active`, `synced_at` | `GET /api/admin/catalog?page&pageSize&q&rarity&type` |
| Toggle ativo | `catalog_items` | `active` | `PATCH /api/admin/catalog/:id` com `{ active: bool }` |
| Sincronização MetaForge | API MetaForge + `catalog_items` | todos os campos | `POST /api/admin/catalog/sync` |

## Lógica de Sincronização

O sync (`POST /api/admin/catalog/sync`):
1. Busca todos os itens da API MetaForge paginada
2. Deduplica por `name_en` e depois por `name` (PT) para evitar duplicatas
3. Faz match com arc-data por `nameEn` para usar traduções curadas e popular `arc_item_id`
4. Traduz nomes não encontrados via API de tradução
5. Remapeia IDs para preservar referências de `stock_items` (FK)
6. Upsert em `catalog_items` com `onConflict: "id"`

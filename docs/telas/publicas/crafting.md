# Crafting

**Rota:** `/crafting`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de consulta de receitas de crafting do jogo. Exibe os materiais disponíveis como ingredientes e os itens que podem ser fabricados, com suporte a filtros por bancada e por material.

## Conteúdo Visível

- **Topbar** — título "Crafting" + contadores: materiais, craftáveis, bancadas
- **Barra de busca** — filtra ambas as seções por nome, tipo ou bancada
- **Seção Materiais** — grid 2 colunas de cards com imagem, tipo e nome; clicável para abrir modal de detalhe
- **Seção Craftáveis** — grid 3 colunas de cards com imagem, raridade, bancada, nome e contagem de ingredientes; clicável para abrir modal de receita
- **Painel lateral** — lista de bancadas com contagem de itens; clique filtra os craftáveis
- **Modal de receita** (craftável) — imagem, raridade, bancada e lista de ingredientes
- **Modal de detalhe do material** — badges de tipo/raridade, stats (peso/valor/pilha), seções: "Pode ser obtido de", "Reciclado em", "Recuperado em", "Usado na fabricação"; botão de filtro

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Materiais | `catalog_items` | `id`, `name`, `item_type`, `rarity`, `icon_url`, `description`, `value`, `weight_kg`, `stack_size` | `GET /api/materials` (filtra `workbench IS NULL` + tipos de material) |
| Craftáveis | `catalog_items` | `id`, `name`, `item_type`, `rarity`, `workbench`, `icon_url`, `recipe` | `GET /api/crafting` (filtra `workbench IS NOT NULL`) |
| Detalhes do material (modal) | `catalog_items` | `obtained_from`, `recycled_into`, `recovered_into`, `used_in_crafting` | `GET /api/items/:id` |
| Craftáveis que usam o material (auto) | `catalog_items` | `recipe` (jsonb containment) | `supabase.filter("recipe", "cs", [{name}])` |
| Itens do used_in_crafting (extras) | `catalog_items` | `id`, `name`, `workbench`, `icon_url`, `recipe` | `POST /api/crafting/by-names` |
| Imagens dos itens referenciados | `catalog_items` + `arcs` | `name`, `icon_url`, `rarity` / `name`, `icon_url`, `threat` | `POST /api/items/images` |
| Inimigos que droppam o material | `arcs` | `id`, `name`, `threat`, `icon_url`, `drops` | `supabase.from("arcs").contains("drops", [item.id])` |

## Lógica de Filtro por Material

Ao clicar em um material e usar "Filtrar craftáveis":
1. Busca `catalog_items.used_in_crafting` via `GET /api/items/:id`
2. Filtra `craftable` cujo `recipe` contém o nome do material
3. Busca itens da lista `used_in_crafting` via `POST /api/crafting/by-names` (independente de terem workbench)
4. Exibe a união dos resultados sem duplicatas

## Estados Especiais

- **Carregando**: texto "Carregando..." nas seções
- **Filtro ativo**: hint acima do grid + botão "Limpar filtros"
- **Material selecionado**: card recebe borda colorida da raridade do tipo
- **Painel fechado**: estado salvo em `localStorage` (chave `crafting-panel-open`)

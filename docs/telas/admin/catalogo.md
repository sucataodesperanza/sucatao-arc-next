# Admin — Catálogo

**Rota:** `/admin/catalogo`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento do catálogo de itens sincronizados via MetaForge. Permite traduzir nomes dentro do site, ativar/desativar itens e sincronizar com a API externa. Não depende de planilha vinculada para editar nomes.

## Conteúdo Visível

- **Busca + filtros** — por nome, raridade e tipo
- **Pesquisa** — o filtro reúne os tipos `Research` e `Research Item` do catálogo.
- **Estampas** — corresponde ao tipo `Stencil`, tanto no filtro quanto no nome da categoria exibido nos itens. Também consta na lista de opções usada em caso de falha no carregamento dos tipos.
- **Tipos do catálogo** — opções carregadas de `/api/admin/catalog/types`, incluindo Design e novas categorias existentes no banco, sem depender apenas de uma lista fixa. Inclui itens ativos e inativos; mantém Pesquisa agrupando os dois tipos equivalentes. Em falha de carregamento usa a lista de opções conhecida.
- **Botão "Sincronizar com MetaForge"** — dispara o sync e exibe resultado (itens atualizados / traduzidos)
- **Tabela paginada** — imagem, nome, tipo, raridade, toggle ativo/inativo
- **Traduções no site** — nome em português ao lado do original em inglês, botão Editar nome e ações Salvar/Cancelar. Enter salva; Escape cancela. A busca consulta os dois idiomas. Erros mantêm o texto para tentar novamente.
- **Proteção das edições** — nomes revisados são registrados em `app_entities` como `catalog_translation`, com identidade determinística por item. As sincronizações de MetaForge e materiais reaplicam essas revisões antes de gravar o catálogo. Se não for possível ler as revisões, a sincronização é interrompida para preservá-las. O nome original `name_en` não é alterado pela edição.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de itens | `catalog_items` | `id`, `name`, `name_en`, `item_type`, `rarity`, `icon_url`, `active`, `synced_at` | `GET /api/admin/catalog?page&pageSize&q&rarity&type` |
| Toggle ativo | `catalog_items` | `active` | `PATCH /api/admin/catalog/:id` com `{ active: bool }` |
| Sincronização MetaForge | API MetaForge + `catalog_items` | todos os campos | `POST /api/admin/catalog/sync` |

## Lógica de Sincronização

O sync (`POST /api/admin/catalog/sync`):
1. Busca todos os itens da API MetaForge paginada
2. Deduplica por `name_en` e depois por `name` (PT) para evitar duplicatas
3. Faz match com arc-data por `nameEn` para usar traduções curadas e popular `arc_item_id`
4. Traduz nomes não encontrados via API de tradução
5. Remapeia IDs para preservar referências de `stock_items` (FK)
6. Reaplica traduções manuais após deduplicação e remapeamento
7. Upsert em `catalog_items` com `onConflict: "id"`

## Operação e manutenção

Busque o nome em português ou inglês, clique em **Editar nome** e salve. O nome original é preservado. Revisões manuais prevalecem sobre a tradução automática nas sincronizações; falhas ao ler essas revisões interrompem o sync.

GET /api/admin/catalog/types lista os tipos existentes. PATCH /api/admin/catalog/:id aceita name e/ou active com permissão de administrador. Pesquisa agrupa Research e Research Item; Design e Estampas estão contemplados no filtro.

Preços ficam em [Preços](../../admin-precos.md), quantidades em [Estoque](estoque.md) e pacotes em [Kits](kits.md). Alterar nomes não define preço nem estoque.

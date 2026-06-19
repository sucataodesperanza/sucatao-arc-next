# Admin — Arcpedia

**Rota:** `/admin/arcpedia`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento dos ARCs (inimigos) exibidos na Arcpedia pública. Permite sincronizar com MetaForge e editar campos específicos como tipo, ameaça, fraqueza e drops.

## Conteúdo Visível

- **Botão "Sincronizar com MetaForge"** — dispara o sync da tabela `arcs`
- **Tabela** — imagem, nome, tipo, ameaça, fraqueza, quantidade de drops; clique abre modal de edição
- **Modal de edição** — campos: tipo (texto), ameaça (select), fraqueza (textarea), drops (nomes separados por vírgula com autocomplete dos itens do arc-data)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de ARCs | `arcs` | `id`, `name`, `type`, `threat`, `weakness`, `drops`, `icon_url` | `GET /api/arcpedia` |
| Editar campos | `arcs` | `type`, `threat`, `weakness`, `drops` | `PATCH /api/admin/arcs/:id` |
| Sincronização | API MetaForge + `arcs` | todos os campos | `POST /api/admin/arcs/sync` |
| Autocomplete de drops | `arc-data.js` (local) | `items[].name` | — |

## Lógica de Sincronização

O sync (`POST /api/admin/arcs/sync`):
1. Busca ARCs da API MetaForge
2. Faz match com `arc-data.bots` pelo nome para popular `drops`, `threat`, `destroyXp`, `lootXp`
3. Traduz nome e fraqueza se ainda não traduzidos
4. Upsert em `arcs` com `onConflict: "id"`

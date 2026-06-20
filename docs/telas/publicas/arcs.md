# ARC Intel

**Rota:** `/arcs`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Guia de campo dos inimigos ARC. Diferente da Arcpedia (que mostra dados sincronizados com MetaForge), esta tela usa o arquivo local `arc-data.js` e tem um visual mais focado em combate: tipo, ameaça, fraqueza, XP e drops detalhados.

## Conteúdo Visível

- **Busca** — filtra por nome, classe, fraqueza ou item de drop
- **Filtros de ameaça** — Low / Medium / High / Apex
- **Contadores** — unidades visíveis e drops únicos
- **Grid de cards** — imagem do bot, nome, tipo, badge de ameaça, fraqueza, XP de derrota/loot, lista de drops com imagem e nome

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de bots | `arc-data.js` (local) | `bots[].id`, `.name`, `.type`, `.threat`, `.description`, `.weakness`, `.destroyXp`, `.lootXp`, `.drops`, `.image` | — |
| Nomes e imagens dos drops | `arc-data.js` (local) | `items[].id`, `.name`, `.image` | — |

## Notas

> Esta tela usa **exclusivamente dados locais** (`arc-data.js`). Não faz nenhuma chamada ao Supabase ou APIs externas.
> A Arcpedia (`/arcpedia`) usa os mesmos inimigos, porém sincronizados via MetaForge com dados enriquecidos.

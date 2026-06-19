# Arcpedia

**Rota:** `/arcpedia`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Enciclopédia dos inimigos ARC do jogo. Exibe cards de cada ARC com informações de ameaça, fraqueza e drops, com modal de detalhe completo.

## Conteúdo Visível

- **Barra de busca** — filtra por nome, tipo, fraqueza ou item de drop
- **Filtros de ameaça** — botões: todos, Low, Medium, High, Apex
- **Grid de cards dos ARCs** — imagem, nome, tipo, badge de ameaça; clique abre modal
- **Modal de detalhe** — imagem, nome, tipo, badge de ameaça, descrição, fraqueza e lista de drops com link para `/itens`
- **Painel lateral** — header do usuário (avatar/nome), contador por nível de ameaça, card do ARC selecionado

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de ARCs | `arcs` | `id`, `name`, `type`, `threat`, `weakness`, `description`, `drops`, `icon_url`, `image_url` | `GET /api/arcpedia` |
| Nomes dos drops (resolver itens) | `arc-data.js` (local) | `items[].id`, `items[].name` | — |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Estados Especiais

- **Sem resultados na busca**: mensagem "Nenhum ARC encontrado."
- **Painel fechado**: estado salvo em `localStorage` (chave `arcpedia-panel-open`)

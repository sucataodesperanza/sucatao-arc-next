# Inventário

**Rota:** `/inventario`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Inventário pessoal do usuário. Exibe os itens que o jogador possui, com estatísticas de raridade, valor estimado e filtros por categoria. Os dados são **mockados** por enquanto — a integração com o banco de dados está planejada para uma próxima etapa.

## Conteúdo Visível

### Abas
- **Visão Geral** (padrão) — conteúdo completo descrito abaixo
- **Itens**, **Histórico**, **Coleções** — "Em breve" (placeholder)

### Topbar
- Título "Inventário" + botão de ajuda
- **Carteira** — saldo de pontos do usuário (`profiles.points`) com botão "+"

### Stats (derivados do mock)
- Itens totais (soma de quantidades) + itens únicos
- Raros, Épicos e Lendários com percentual do total
- Valor estimado total

### Filtros
- Busca por nome (visual, não funcional ainda)
- Selects de raridade, categoria, origem e ordenação (visuais)

### Grade de categorias
- Pills: Todos, Armas, Equipamentos, Recursos, Componentes, Outros — com contagem

### Grid de itens (6 colunas)
- Cards com badge de raridade colorido, imagem do item (via `/api/items/images`), quantidade, nome, categoria e valor
- Altura fixa: 200px com overflow hidden
- Loading via efeito `skeleton-block` enquanto imagens carregam

### Painel lateral
- `SidePanelUserHeader` (com reputação)
- **Resumo do Inventário** — donut chart SVG (sem biblioteca externa) com legenda por raridade
- **Mais valiosos** — top 5 itens ordenados por valor
- **Ações rápidas** — Entregar Itens (→ `/loja`), Ver Loja (→ `/loja`), Transferir e Favoritos (Em breve)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| **Itens do inventário** | **Mock hardcoded** | — | — (integração com banco pendente) |
| Imagens dos itens | `catalog_items` | `icon_url`, `rarity` | `POST /api/items/images` (busca por nome) |
| Pontos do usuário (carteira) | `profiles` | `points` | `supabase.from("profiles").select("points")` |
| Avatar e nome | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Mock atual

Os 24 itens do mock são itens reais do `arc-data.js` (nomes exatos) para que a API `/api/items/images` consiga encontrar as imagens no `catalog_items`. Exemplo de itens: Afélio, Dolabra, Equalizador, Júpiter (lendários), Bettina IV, Bettina III (épicos), Bateria ARC Avançada (raro), etc.

## Estados Especiais

- **Carregando imagens**: área de mídia dos cards exibe shimmer animado (`skeleton-block`)
- **Painel fechado**: estado salvo em `localStorage` (chave `inventario-panel-open`)

## Próxima etapa (não implementado)

Substituir o mock por dados reais de uma tabela `inventory` (ou `player_inventory`) no Supabase, contendo os itens que o usuário possui com suas respectivas quantidades.

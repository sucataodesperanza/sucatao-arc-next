# Início

**Rota:** `/`  
**Requer autenticação:** Sim (middleware global — redireciona para `/login` se não autenticado)

## Descrição

Tela inicial do site. Exibe notícias, um banner promocional, cards de acesso rápido às seções e um painel lateral com trades recentes da comunidade.

## Conteúdo Visível

- **Notas de atualização** — 2 cards de notícias com imagem, título, texto e data
- **Banner hero** ("Novidades") — imagem de fundo, tag, título, descrição e botão "Ver catálogo"
- **Pontos de ataques** — 4 cards de categorias: Itens, Trades, Crafting, Mapas
- **Painel lateral — Trades** — abas Todos / Meus Trades / Seguidos; lista de 5 ofertas com usuário, nível, itens procurados e pontos oferecidos; botão "Ver todos os trades"
- **Painel lateral — Header do usuário** — avatar, nome, nível, status online/offline

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Notícias | **Hardcoded** | — | — |
| Banner hero | **Hardcoded** | — | — |
| Cards de categoria | **Hardcoded** | — | — |
| Trades na lista | **Hardcoded** (mock) | — | — |
| Itens nos trades (imagens) | `arc-data.js` (local) | `items[].image`, `items[].rarity` | `pickItem(rarity, index)` |
| Nome do usuário | `auth` | `user.user_metadata.name` | `supabase.auth.getUser()` |
| Avatar do usuário | `profiles` | `avatar_url` | `supabase.from("profiles").select("avatar_url").eq("id", user.id)` |

## Estados Especiais

- **Sem login**: painel exibe "Visitante" sem avatar; trades ainda aparecem (mock)
- **Painel fechado**: estado salvo em `localStorage` (chave `trades-panel-open`); botão de reabertura aparece no canto

## Notas

> Os trades exibidos na home são **dados mockados** (hardcoded). Não refletem trades reais do banco de dados.

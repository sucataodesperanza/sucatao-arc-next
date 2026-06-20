# Início

**Rota:** `/`  
**Requer autenticação:** Sim (middleware global — redireciona para `/login` se não autenticado)

## Descrição

Tela inicial do site. Exibe notícias, um banner promocional, cards de acesso rápido às seções e um painel lateral com os trades ativos do Sucatão e o histórico de trades do usuário logado.

## Conteúdo Visível

- **Notas de atualização** — 2 cards de notícias com imagem, título, texto e data (hardcoded)
- **Banner hero** ("Novidades") — imagem de fundo, tag, título, descrição e botão "Ver catálogo" (hardcoded)
- **Cards de categoria** — 4 cards: Itens, Trades, Crafting, Mapas (hardcoded)
- **Painel lateral — Header do usuário** — avatar, nome, reputação, badge Mercador
- **Painel lateral — Trades**
  - **Aba "Todos"** — lista dos últimos 5 trades ativos criados pelo Sucatão; cada card mostra pontos oferecidos × item procurado (imagem, raridade, quantidade). Botão "Aceitar" aparece para usuários logados.
  - **Aba "Meus Trades"** — histórico de trades que o usuário aceitou, com status (Aguardando / Concluído / Cancelado)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Notícias | **Hardcoded** | — | — |
| Banner hero | **Hardcoded** | — | — |
| Cards de categoria | **Hardcoded** | — | — |
| Trades ativos (aba Todos) | `trades` | `id`, `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity`, `created_at` | `GET /api/trades` (status = active, limit 5) |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Histórico do usuário (aba Meus Trades) | `trade_acceptances` + `trades` | `status`, `created_at`, trade completo | `GET /api/trades/my` |
| Nome do usuário | `auth` | `user.user_metadata.name` | `supabase.auth.getUser()` |
| Avatar e pontos | `profiles` | `avatar_url`, `points` | `supabase.from("profiles").select(...)` |

## Regras de Negócio

- Apenas o **Sucatão de Speranza** (admin) cria trades — usuários não criam
- Um usuário pode aceitar cada trade no máximo **uma vez** (unique constraint em `trade_acceptances`)
- Trades com `status ≠ active` não aparecem na lista pública
- O botão "Aceitar" só aparece para usuários logados; após aceitar, mostra "✓"
- Aba "Meus Trades" só carrega quando o usuário clica nela (lazy) e está logado

## Estados Especiais

- **Sem login**: aba "Todos" mostra trades mas sem botão "Aceitar"; aba "Meus Trades" mostra mensagem de login
- **Sem trades ativos**: mensagem "Nenhum trade ativo no momento."
- **Painel fechado**: estado salvo em `localStorage` (chave `trades-panel-open`)

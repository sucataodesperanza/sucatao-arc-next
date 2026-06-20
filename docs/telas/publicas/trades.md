# Trades

**Rota:** `/trades`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Vitrine dos trades do Sucatão de Speranza. Exibe os trades ativos (pontos oferecidos × item desejado) e o histórico de trades aceitos pelo usuário logado. Apenas o admin cria trades — usuários somente aceitam.

## Conteúdo Visível

- **Painel lateral** — header do usuário (avatar, reputação)
- **Aba "Todos"** — lista paginada de trades ativos com: avatar do Sucatão, pontos oferecidos, item procurado (imagem, raridade, quantidade), botão "Aceitar trade"
- **Aba "Meus Trades"** — histórico de aceitações do usuário com status (Aguardando / Concluído / Cancelado) e data

> A aba "Seguidos" foi removida — não faz parte do modelo de trades do Sucatão.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Trades ativos | `trades` | `id`, `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity`, `status`, `created_at` | `GET /api/trades` |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Histórico do usuário | `trade_acceptances` + `trades` | `status`, `created_at`, trade completo | `GET /api/trades/my` |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Regras de Negócio

- Trades são criados **exclusivamente pelo admin** no painel `/admin/trades`
- Usuário pode aceitar cada trade no máximo **uma vez** (constraint unique em `trade_acceptances`)
- Após aceitar: status fica `pending` até o admin marcar como `completed` ou `cancelled`
- Trades `paused` ou `completed` não aparecem na listagem pública

## Estados Especiais

- **Sem login**: lista de trades visível mas sem botão "Aceitar"
- **Sem trades ativos**: mensagem de lista vazia

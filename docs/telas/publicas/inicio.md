# Início

**Rota:** `/`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela inicial do site. Exibe notas de atualização, banner hero, cards de categoria e painel lateral de trades com duas abas funcionais: trades ativos do Sucatão e histórico pessoal do usuário.

## Conteúdo Visível

- **Notas de atualização** — 2 cards hardcoded com imagem, título, texto e data
- **Banner hero** — hardcoded
- **Cards de categoria** — 4 cards hardcoded (Itens, Trades, Crafting, Mapas)
- **Painel lateral — Aba "Todos"** — até 5 trades ativos do Sucatão não aceitos por ninguém; cada card mostra logo do Sucatão, badge "Oficial", pontos oferecidos, imagem + nome + raridade do item procurado, botão "Aceitar trade"
- **Painel lateral — Aba "Meus Trades"** — lista de trades aceitos pelo usuário com status colorido

### Aba "Meus Trades" — estados dos cards

| Status | O que aparece |
|---|---|
| `pending` | Badge "Em progresso" amarelo + instruções para agendar via `/trades` |
| `scheduled` | Badge "Agendado" azul + horário confirmado (`scheduled_at`) + Game ID |
| `completed` | Badge "Concluído" verde + pontos creditados |

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Notícias, banner e categorias | **Hardcoded** | — | — |
| Trades ativos (aba Todos) | `trades` | `id`, `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity` | `GET /api/trades` (exclui trades com aceite ativo) |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Meus trades (aba Meus Trades) | `trade_acceptances` + `trades` | `status`, `scheduled_at`, `game_id` | `GET /api/trades/my` |
| Avatar e pontos do usuário | `profiles` + `auth` | `avatar_url`, `points`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Regras de Negócio

- Apenas o **Sucatão de Speranza** (admin) cria trades
- Cada trade só pode ser aceito por **UMA pessoa** — primeiro a aceitar ganha; trade some da listagem para todos
- Trades com `status ≠ active` não aparecem na listagem pública
- O agendamento do horário de entrega é feito em `/trades` (aba "Meus Trades"), não na home
- A aba ativa ("Todos" / "Meus Trades") é persistida em `localStorage` (chave `trades-active-tab`)

## Estados Especiais

- **Sem login**: botão "Aceitar" não aparece; aba "Meus Trades" mostra "Faça login"
- **Trade já aceito pelo usuário**: botão vira "✓ Trade aceito" (desabilitado)
- **Painel fechado**: estado salvo em `localStorage` (chave `trades-panel-open`)

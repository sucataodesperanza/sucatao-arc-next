# Início

**Rota:** `/`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela inicial do site. Exibe notícias, banner, cards de categoria e painel lateral de trades com duas abas funcionais: trades ativos do Sucatão e histórico pessoal do usuário com agendamento in-game.

## Conteúdo Visível

- **Notas de atualização** — 2 cards hardcoded com imagem, título, texto e data
- **Banner hero** — hardcoded
- **Cards de categoria** — 4 cards hardcoded (Itens, Trades, Crafting, Mapas)
- **Painel lateral — Aba "Todos"** — até 5 trades ativos do Sucatão; cada card mostra logo do Sucatão, badge "Oficial", pontos oferecidos, imagem + nome + raridade do item procurado, botão "Aceitar trade"
- **Painel lateral — Aba "Meus Trades"** — lista de trades aceitos pelo usuário com acordeão expansível por card

### Acordeão "Meus Trades"

Clicar em qualquer parte do card expande o acordeão. Conteúdo varia por status:

| Status | Conteúdo do acordeão |
|---|---|
| `pending` | Grade de slots disponíveis + campo Game ID + botão "Confirmar horário" |
| `scheduled` | Slot confirmado (label) + instrução de aguardar no jogo |
| `completed` | "Entrega concluída! X pts creditados na sua carteira" |

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Notícias | **Hardcoded** | — | — |
| Banner e categorias | **Hardcoded** | — | — |
| Trades ativos (aba Todos) | `trades` | `id`, `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity`, `created_at` | `GET /api/trades` |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Histórico do usuário (aba Meus Trades) | `trade_acceptances` + `trades` + `trade_slots` | todos os campos | `GET /api/trades/my` |
| Slots disponíveis (agendamento) | `trade_slots` | `id`, `label`, `scheduled_for`, `capacity` | `GET /api/trades/slots` (filtra lotados e passados) |
| Confirmar horário | `trade_acceptances` | `slot_id`, `game_id`, `status` | `PATCH /api/trades/my/:id/schedule` |
| Avatar e pontos do usuário | `profiles` + `auth` | `avatar_url`, `points`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Regras de Negócio

- Apenas o **Sucatão de Speranza** (admin) cria trades
- Usuário aceita cada trade no máximo **uma vez** (`UNIQUE (trade_id, user_id)`)
- Trades com `status ≠ active` não aparecem na listagem pública
- O agendamento verifica a capacidade do slot em tempo real — slot lotado retorna erro 409
- A aba ativa ("Todos" / "Meus Trades") é persistida em `localStorage` (chave `trades-active-tab`)
- `myTrades` é carregado automaticamente quando o `userId` fica disponível (não depende da aba ativa)

## Estados Especiais

- **Sem login**: botão "Aceitar" não aparece; aba "Meus Trades" mostra "Faça login"
- **Trade já aceito**: botão vira "✓ Trade aceito" (desabilitado)
- **Painel fechado**: estado salvo em `localStorage` (chave `trades-panel-open`)

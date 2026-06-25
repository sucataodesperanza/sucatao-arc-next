# Trades

**Rota:** `/trades`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Vitrine dos trades do Sucatão de Sperança. Cada trade é exclusivo (primeiro a aceitar ganha) — pontos oferecidos em troca de um item específico do jogador. Inclui sistema de agendamento de entrega in-game com horário de funcionamento configurável pelo admin.

## Abas

| Aba | Conteúdo |
|---|---|
| **Todos** | Trades ativos do Sucatão ainda **não aceitos** por ninguém. Filtros: busca, raridade, ordenação. |
| **Meus Trades** | Trades aceitos pelo usuário logado, com todos os status e modal de agendamento. |

## Aba "Todos"

- Hero banner rotativo (3 slides decorativos)
- Barra de filtros: busca por nome do item, raridade, categoria (visual), plataforma (visual), ordenação
- Grid de cards 3 colunas: logo Sucatão, pontos oferecidos ↔ item procurado (imagem, raridade, quantidade)
- Botão **"Aceitar trade"** — ao aceitar, o card permanece visível mas o botão fica desabilitado ("✓ Trade aceito")
- Ao aceitar com sucesso: página troca automaticamente para aba "Meus Trades"
- Trades já aceitos por QUALQUER usuário NÃO aparecem nesta lista

## Aba "Meus Trades"

- Filtros: busca por item, status, ordenação
- Grid 3 colunas de cards com status colorido (Em progresso / Agendado / Concluído / Cancelado)
- Clique em card com status **"Em progresso"** ou **"Agendado"** abre modal de agendamento

### Modal de Agendamento

1. Resumo do trade (item + pontos)
2. **Seleção de data** (date picker, só datas futuras)
3. **Grade de horários disponíveis** — gerada automaticamente dentro do horário de funcionamento, de 5 em 5 minutos, excluindo horários já ocupados por outros agendamentos
4. Campo **Game ID** (como o Sucatão te encontra no jogo)
5. Botão confirmar com resumo: "✓ Confirmar 25/06 às 15:00"

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint |
|---|---|---|---|
| Trades ativos (Todos) | `trades` | todos | `GET /api/trades` (exclui trades com aceite ativo) |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Meus trades | `trade_acceptances` + `trades` | `status`, `scheduled_at`, `game_id` + trade | `GET /api/trades/my` |
| Horários disponíveis | `trade_acceptances` + `trade_settings` | `scheduled_at`, horário de funcionamento | `GET /api/trades/available-times?date=YYYY-MM-DD` |
| Agendar horário | `trade_acceptances` | `scheduled_at`, `game_id`, `status` | `PATCH /api/trades/my/:id/schedule` |
| Avatar e pontos | `profiles` + `auth` | `avatar_url`, `user_metadata.name`, `points` | `supabase.auth.getUser()` + `profiles` |

## Regras de Negócio

- Cada trade só pode ser aceito por **UMA pessoa** — primeiro a clicar ganha
- Após aceitação: status vai para `pending` → usuário agenda → `scheduled` → admin conclui → `completed`
- **Horário de funcionamento**: configurado pelo admin, vale todos os dias. Padrão: 09:00 às 00:00
- **Slots de agendamento**: de 5 em 5 minutos dentro do horário de funcionamento
- **Conflito**: se um horário já está agendado por outro usuário, ele não aparece como opção
- **Verificação dupla de conflito**: no servidor (em `PATCH /schedule`) mesmo que dois usuários tentem o mesmo horário simultaneamente

## Estados dos Cards (Meus Trades)

| Status | Badge | O que significa | Ação disponível |
|---|---|---|---|
| `pending` | "Em progresso" amarelo | Aceito mas sem horário | Clicar abre modal de agendamento |
| `scheduled` | "Agendado" azul | Horário confirmado | Clicar mostra os detalhes |
| `completed` | "Concluído" verde | Entrega feita, pontos creditados | Card somente leitura |
| `cancelled` | "Cancelado" vermelho | Trade cancelado | Card somente leitura |

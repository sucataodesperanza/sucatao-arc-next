# Trades

**Rota:** `/trades`  
**Acesso:** login obrigatório para solicitar e consultar as próprias trades

## Descrição

Vitrine dos trades do Sucatão de Sperança. Cada trade é exclusivo (primeiro a aceitar ganha) — pontos oferecidos em troca de um item específico do jogador. Inclui sistema de agendamento de entrega in-game com horário de funcionamento configurável pelo admin.

## Abas

| Aba | Conteúdo |
|---|---|
| **Todos** | Trades ativos do Sucatão ainda **não aceitos** por ninguém. Filtros: busca, raridade, ordenação. |
| **Meus Trades** | Trades aceitos pelo usuário logado, com status e horário confirmado. |

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
- Cards exibem os dados e o horário da solicitação

### Solicitação com agendamento

Na aba Todos, Aceitar trade abre o formulário no próprio card. Escolha o dia entre hoje e os seis dias seguintes, o horário e informe seu Game ID. Todos os horários seguem **America/Cuiaba (UTC−4)**, inclusive para clientes em outros fusos.

As opções vêm do horário diário salvo em Admin → Trades, em intervalos configurados (padrão 5 minutos), sem cadastro manual de janelas. Horários passados ou ocupados por aceitações não canceladas são excluídos. Falha de leitura mostra erro e opção de tentar novamente, em vez de fingir que a agenda está vazia.

O servidor confere novamente a disponibilidade ao confirmar. Um conflito retorna erro e mantém o cliente no formulário; somente sucesso abre Meus Trades. A solicitação já é gravada como scheduled, com scheduled_at e game_id. Montar a solicitação não cria reserva.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint |
|---|---|---|---|
| Trades ativos (Todos) | `trades` | todos | `GET /api/trades` (exclui trades com aceite ativo) |
| Aceitar trade | `trade_acceptances` | `trade_id`, `user_id`, `status` | `POST /api/trades/:id/accept` |
| Meus trades | `trade_acceptances` + `trades` | `status`, `scheduled_at`, `game_id` + trade | `GET /api/trades/my` |
| Horários disponíveis | `trade_acceptances` + `trade_settings` | `scheduled_at`, horário de funcionamento | `GET /api/trades/slots` |
| Agendar horário | `trade_acceptances` | `scheduled_at`, `game_id`, `status` | `PATCH /api/trades/my/:id/schedule` |
| Avatar e pontos | `profiles` + `auth` | `avatar_url`, `user_metadata.name`, `points` | `supabase.auth.getUser()` + `profiles` |

## Regras de Negócio

- Cada trade só pode ser aceito por **UMA pessoa** — primeiro a clicar ganha
- Solicitação atual: `scheduled` → admin conclui → `completed`. Aceitações antigas podem continuar como `pending`.
- **Horário de funcionamento**: configurado pelo admin, vale todos os dias. Padrão: 09:00 às 00:00
- **Slots de agendamento**: de 5 em 5 minutos dentro do horário de funcionamento
- **Conflito**: se um horário já está agendado por outro usuário, ele não aparece como opção
- **Disponibilidade:** o servidor relê os agendamentos de todos os clientes ao confirmar. A seleção na tela não reserva horário.

## Estados dos Cards (Meus Trades)

| Status | Badge | O que significa | Ação disponível |
|---|---|---|---|
| `pending` | "Em progresso" amarelo | Aceito mas sem horário | Clicar abre modal de agendamento |
| `scheduled` | "Agendado" azul | Horário confirmado | Clicar mostra os detalhes |
| `completed` | "Concluído" verde | Entrega feita, pontos creditados | Card somente leitura |
| `cancelled` | "Cancelado" vermelho | Trade cancelado | Card somente leitura |

## Correção de 20/10/2026

O formulário antigo consultava trade_slots, apesar de o admin configurar a agenda diária em trade_settings. Sem janelas futuras manuais, nenhuma opção aparecia. A consulta atual gera horários pelo funcionamento diário, preserva trades/agendamentos existentes e não exige migração. Janelas manuais antigas ainda são reconhecidas ao confirmar solicitações antigas; os novos horários são identificados por daily: e gravados em scheduled_at, com slot_id nulo.

## Disponibilidade após solicitação — 20/10/2026

GET /api/trades consulta o banco sem cache e exclui todas as trades com aceitação não cancelada, independentemente do cliente, inclusive concluídas. A leitura é paginada. Erros não são tratados como uma lista vazia válida. Após confirmar, a trade sai imediatamente de Todos e permanece em Meus Trades e no admin. Outras abas abertas atualizam a lista a cada 15 segundos enquanto visíveis e ao recuperar foco. Uma solicitação cancelada libera novamente a trade se o cadastro continuar ativo e não houver outra aceitação ativa. Nenhuma solicitação é apagada para ocultar o anúncio.

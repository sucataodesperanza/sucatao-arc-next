# Trades

**Rota:** `/trades`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Vitrine pública dos trades do Sucatão de Sperança. Exibe os trades ativos e o histórico de trades do usuário logado. Apenas o admin cria trades — usuários somente aceitam.

> **Nota:** A tela `/trades` ainda usa **dados mockados** para a listagem principal. A integração com o banco (`GET /api/trades`) está implementada apenas no painel da home. A migração completa desta tela é uma próxima etapa.

## Conteúdo Visível

- **Painel lateral** — header do usuário (avatar, reputação)
- **Aba "Todos"** — lista mockada de trades (a ser migrada para `GET /api/trades`)
- **Aba "Meus Trades"** — histórico mockado (a ser migrado para `GET /api/trades/my`)

## Fontes de Dados (estado atual)

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de trades | **Hardcoded** (mock) | — | — |
| Histórico de trades | **Hardcoded** (mock) | — | — |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## APIs Disponíveis (prontas para integrar)

| Endpoint | Descrição |
|---|---|
| `GET /api/trades` | Lista trades ativos |
| `POST /api/trades/:id/accept` | Aceita um trade |
| `GET /api/trades/my` | Histórico de aceitações do usuário |
| `GET /api/trades/slots` | Slots disponíveis para agendamento |
| `PATCH /api/trades/my/:id/schedule` | Agenda um horário in-game |

## Regras de Negócio

- Trades são criados **exclusivamente pelo admin** em `/admin/trades`
- Usuário aceita cada trade no máximo **uma vez**
- Após aceitar → status `pending` → usuário agenda um slot → status `scheduled` → admin conclui → `completed`
- Ao concluir, `profiles.points` do usuário recebe `trades.offer_points` automaticamente

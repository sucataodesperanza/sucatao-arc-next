# Trades

**Rota:** `/trades`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Marketplace de trocas entre jogadores. Exibe ofertas da comunidade onde usuários propõem trocar pontos por itens específicos.

## Conteúdo Visível

- **Painel lateral** — header do usuário, atividade recente de trades
- **Abas** — Todos / Meus Trades / Seguidos
- **Aba Todos** — banner; filtros de busca, categoria, raridade e plataforma; lista de ofertas paginada com: avatar, nome, nível, tempo, pontos oferecidos, item procurado + modal de confirmação de trade
- **Aba Meus Trades** — histórico de trocas do usuário com parceiro e data
- **Botão "+"** — modal de criação de trade (formulário com item procurado, quantidade, pontos)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de ofertas | **Hardcoded** (mock) | — | — |
| Atividade recente | **Hardcoded** (mock) | — | — |
| Histórico | **Hardcoded** (mock) | — | — |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Notas

> Todos os dados de trades são **mockados**. Nenhuma integração com Supabase foi implementada ainda para esta funcionalidade.

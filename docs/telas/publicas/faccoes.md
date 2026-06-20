# Facções

**Rota:** `/faccoes`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de escolha e consulta de facções do jogo. Apresenta as 5 facções disponíveis com bônus e comparativo. A escolha de facção é permanente (apenas visual por enquanto).

## Conteúdo Visível

- **Banner hero** — aviso sobre escolha permanente de facção
- **Grid de 5 facções** — ícone, nome, tagline, descrição, lista de bônus, botão "Escolher"
  - Catadores, Mercadores, Caçadores, Vigilantes, Sobreviventes
- **Modal de confirmação** — confirma a escolha da facção
- **Painel lateral** — header do usuário, reputação geral, tabela comparativa de bônus entre facções, feed de atividade das facções

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Dados das facções | **Hardcoded** | — | — |
| Comparativo de bônus | **Hardcoded** | — | — |
| Feed de atividade | **Hardcoded** | — | — |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Notas

> Toda a lógica de facções é **hardcoded**. A escolha de facção não persiste no banco de dados ainda.

# Contratos

**Rota:** `/contratos`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de missões/contratos diários e semanais do jogo. Exibe contratos com progresso, recompensas e countdowns de reset.

## Conteúdo Visível

- **4 abas** — Contratos Ativos, Contratos Diários, Contratos Semanais, Histórico
- **Aba Ativos** — banner hero, resumo geral de contratos, cards de contratos com barra de progresso e recompensas
- **Aba Diários** — lista com countdown até meia-noite (reset), barra de progresso por contrato, botão aceitar/concluído
- **Aba Semanais** — lista com countdown até segunda-feira, bônus ao completar todos os semanais
- **Painel lateral** — header do usuário, reputação, próximas recompensas, resumo diário e semanal

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Todos os contratos | **Hardcoded** | — | — |
| Recompensas | **Hardcoded** | — | — |
| Progresso | **Hardcoded** | — | — |
| Countdowns | Calculado em runtime | Data/hora atual | `new Date()` |
| Avatar e nome do usuário | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |

## Notas

> Toda a lógica de contratos é **hardcoded**. Nenhuma integração com Supabase foi implementada. O progresso dos contratos não persiste.

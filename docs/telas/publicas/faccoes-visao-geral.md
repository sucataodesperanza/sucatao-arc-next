# Facções — Visão Geral

**Rota:** `/faccoes/visao-geral`  
**Requer autenticação:** Sim (middleware global)

## Comportamento de entrada

- Se o usuário **não tem facção** → redireciona para `/faccoes`
- Todos os dados carregados em uma única chamada: `GET /api/faccoes/dashboard`

## Layout

```
┌─────────────────────────────────────────────┬──────────────────┐
│  Topbar (título + widget guerra)            │                  │
├───────────────────────────┬─────────────────┤   Sidebar        │
│  Área principal           │  Coluna direita │   direita        │
│  • Panorama               │  • Contribuição │   • Perfil       │
│  • Recompensas (carousel) │  • Objetivos    │   • Atividades   │
│  • Atividade da facção    │                 │   • Eventos      │
│  • Vantagens ativas       │                 │   • Recompensa   │
└───────────────────────────┴─────────────────┴──────────────────┘
```

## Seções

### Topbar
- Título "FACÇÕES" + ícone de ajuda
- Widget decorativo "GUERRA DE FACÇÕES — Termina em: 26d 08h 34m"

### Panorama do Sucatão ⚠️ decorativo
Barras de poder por facção (% e pts), donut chart com total. Os pontos exibidos são calculados a partir do COUNT de membros × 1000 (aproximação). Sistema de guerra real não implementado.

### Recompensas em Destaque ⚠️ decorativo
Carrossel horizontal com 5 níveis de recompensa (Veterano → Lendário). Dados fixos no frontend.

### Atividade da Facção ✅ real
Feed das últimas 15 atividades de membros da facção do usuário. Vem de `user_faction_activity`. Ao ingressar na facção, o evento `join` é inserido automaticamente.

### Vantagens Ativas ✅ real
Cards com os bônus da facção (`factions.bonuses`). Apenas bônus que começam com `+` são exibidos como cards. O regex `^(\+[\d%]+)\s+(.+)$` extrai o valor percentual e o label.

### Como Funciona ⚠️ decorativo
4 passos fixos explicando o loop de jogo das facções.

### Sua Contribuição ⚠️ decorativo
Posição na facção (`#—`), pontos contribuídos e contratos concluídos exibem `—`. Sistema de contribuição não implementado. Exibe o total de membros real.

### Objetivos da Facção ⚠️ decorativo
3 objetivos com barras de progresso. Dados fixos no frontend.

## Sidebar direita

### Perfil do usuário ✅ real
Avatar e nome de `profiles` + `auth`. Exibe a facção atual e data de ingresso (`user_factions.joined_at`). Contagem real de membros da facção.

### Atividades Recentes ✅ real
Últimas 10 atividades do próprio usuário em `user_faction_activity` (filtrado por `user_id`).

### Próximos Eventos ⚠️ decorativo
3 eventos fixos com countdown hardcoded.

### Recompensa da Guerra ⚠️ decorativo
3 itens de recompensa fixos. Sistema de guerra não implementado.

## Fontes de Dados

| Conteúdo | Real / Decorativo | Tabela / Fonte | Endpoint |
|---|---|---|---|
| Dados da facção (nome, cor, ícone, bônus) | ✅ Real | `factions` | `GET /api/faccoes/dashboard` |
| Contagem de membros por facção | ✅ Real | `user_factions` (COUNT) | incluso no dashboard |
| Feed de atividade da facção | ✅ Real | `user_faction_activity` | incluso no dashboard |
| Atividades recentes do usuário | ✅ Real | `user_faction_activity` | incluso no dashboard |
| Perfil + avatar do usuário | ✅ Real | `profiles` + `auth` | incluso no dashboard |
| Data de ingresso | ✅ Real | `user_factions.joined_at` | incluso no dashboard |
| Vantagens ativas | ✅ Real | `factions.bonuses` | incluso no dashboard |
| Panorama / guerra / pontos | ⚠️ Decorativo | — | — |
| Recompensas em destaque | ⚠️ Decorativo | — | — |
| Contribuição / posição / contratos | ⚠️ Decorativo | — | — |
| Objetivos da facção | ⚠️ Decorativo | — | — |
| Próximos eventos | ⚠️ Decorativo | — | — |
| Recompensa da guerra | ⚠️ Decorativo | — | — |

## Tabs

| Tab | Status |
|---|---|
| Visão Geral | ✅ Implementado |
| Guerra de Facções | 🔜 Em breve |
| Ranking de Facções | 🔜 Em breve |
| Recompensas | 🔜 Em breve |
| Minha Facção | 🔜 Em breve |

## Tabela `user_faction_activity`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → auth.users | Usuário que gerou o evento |
| `faction_id` | uuid FK → factions | Facção relacionada |
| `display_name` | text | Nome exibido no feed (nome do usuário no momento do evento) |
| `text` | text | Descrição da ação (ex: "se juntou à facção") |
| `points` | integer nullable | Pontos para a facção (opcional) |
| `event_type` | text | `join`, `contract`, `delivery`, `generic` |
| `created_at` | timestamptz | — |

RLS: usuário vê suas próprias atividades + todas as atividades da sua facção.

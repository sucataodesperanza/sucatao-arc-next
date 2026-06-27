# Contratos

**Rota:** `/contratos`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Tela de missões/contratos do Sucatão. A aba **Contratos Ativos** é dinâmica — dados vêm do banco, criados e gerenciados pelo admin. As demais abas (Diários, Semanais, Histórico) permanecem estáticas por enquanto.

## Abas

| Aba | Status | Fonte |
|---|---|---|
| Contratos Ativos | ✅ Dinâmico | `contracts` + `user_contracts` |
| Contratos Diários | ⚠️ Estático | Hardcoded |
| Contratos Semanais | ⚠️ Estático | Hardcoded |
| Histórico | ⚠️ Estático | Hardcoded |

## Aba "Contratos Ativos"

- Banner hero + Resumo Geral (hardcoded)
- **Cards de contrato** vindos do banco, com: tipo, tier, título, objetivo, progresso, recompensas, expiração, taxa de sucesso
- Variantes visuais: `dourada`, `holografica`, `corrompida`
- **Modal de detalhes**: story, localização, condições ambientais, sub-objetivos, inimigos, bônus de sucesso, estatísticas
- **Botão Aceitar** → cria `user_contract` com status `active`
- Após aceitar: botão vira badge **Em progresso** ou **Concluído**

### Progresso do usuário
O progresso (`progress/total`) é atualizado manualmente pelo admin em `/admin/contratos`. Quando o admin clica **Concluir**, o status muda para `completed` e `profiles.points` é creditado com o valor de `sucatas` do contrato.

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Endpoint |
|---|---|---|
| Lista de contratos ativos | `contracts` | `GET /api/contratos` |
| Progresso do usuário | `user_contracts` | incluso em `GET /api/contratos` |
| Aceitar contrato | `user_contracts` | `POST /api/contratos/:id/accept` |
| Imagem do contrato | Storage `contract-images` ou `/assets/bots/` | `contracts.image_url` |
| Countdowns (diários/semanais) | Calculado em runtime | `new Date()` |
| Painel lateral | **Hardcoded** | — |

## Tabela `contracts`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `type` | text | `Principal` \| `Secundário` \| `Diário` \| `Facção` |
| `tier` | text | `Básico` \| `Avançado` \| `Épico` \| `Lendário` |
| `title` | text | Título exibido no card |
| `description` | text | Descrição curta no card |
| `story` | text | Texto longo na modal de detalhes |
| `image_url` | text | URL da imagem (Storage ou `/assets/`) |
| `objective` | text | Resumo do objetivo exibido no card |
| `total` | integer | Quantidade total para completar |
| `sucatas` | integer | Recompensa em pontos (creditada ao concluir) |
| `xp` | integer | Recompensa em XP (exibida, não creditada ainda) |
| `rep` | integer nullable | Recompensa em REP (exibida) |
| `location` | text | Local da operação |
| `estimated_time` | text | Ex: "20 - 35 min" |
| `best_time_of_day` | text | Ex: "Noite" |
| `climate` | text | Ex: "Nublado" |
| `environmental_risk` | text | `Baixo` \| `Médio` \| `Alto` \| `Extremo` (visual, cor na modal) |
| `expires_at` | timestamptz | Data de expiração |
| `variant` | text nullable | `dourada` \| `holografica` \| `corrompida` |
| `bonus_condition` | text | Condição do bônus (ex: "Elimine todos sem morrer") |
| `bonus_reward` | text | Recompensa do bônus (ex: "+80 REP extra") |
| `rewards` | jsonb `[]` | `[{kind, amount}]` ou `[{kind:"item", item_name, item_image, item_qty}]` |
| `objectives` | jsonb `[]` | `[{text, desc, total}]` — sub-objetivos na modal |
| `enemies` | jsonb `[]` | `[{name, type, dots, color, image}]` — inimigos na modal |
| `success_rate` | integer | % de sucesso (exibido no card) |
| `players_completed` | integer | Qtd de jogadores que completaram |
| `best_record_time` | text | Ex: "14m 12s" |
| `best_record_player` | text | Nome do jogador com melhor tempo |
| `active` | boolean | `false` = oculto na listagem pública (admin vê todos) |

## Tabela `user_contracts`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid FK → auth.users | Usuário |
| `contract_id` | uuid FK → contracts | Contrato aceito |
| `progress` | integer | Progresso atual (atualizado pelo admin) |
| `status` | text | `active` \| `completed` \| `failed` \| `expired` |
| `accepted_at` | timestamptz | Quando aceitou |
| `completed_at` | timestamptz | Quando foi concluído |

> UNIQUE (`user_id`, `contract_id`) — usuário não pode aceitar o mesmo contrato duas vezes.

## Regras de Negócio

- Admin cria contratos com CRUD completo em `/admin/contratos`
- RLS `contracts_select_active` bloqueia contratos inativos para usuários; admin usa `createAdminClient()` para ver todos
- Ao concluir: `user_contracts.status = completed` + `profiles.points += contracts.sucatas`
- XP e REP são exibidos mas **não creditados automaticamente** ainda

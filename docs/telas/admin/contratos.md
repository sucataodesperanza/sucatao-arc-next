# Admin — Contratos

**Rota:** `/admin/contratos`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento de dois sistemas de contratos: contratos individuais (tabela `contracts`) e contratos sequenciais por facção/gerais (tabela `contract_groups`).

---

## Seção 1 — Contratos Individuais

Tabela de todos os contratos (ativos e inativos). GET usa `createAdminClient()` para bypassar RLS.

### Criar contrato

Botão **Novo Contrato** expande formulário com:

| Campo | Descrição |
|---|---|
| Tipo | `Principal` \| `Secundário` \| `Diário` \| `Facção` |
| Tier | `Básico` \| `Avançado` \| `Épico` \| `Lendário` |
| Risco Ambiental | `Baixo` \| `Médio` \| `Alto` \| `Extremo` |
| Variante | Nenhuma \| `dourada` \| `holográfica` \| `corrompida` |
| Título + Objetivo | Exibidos no card |
| Total | Meta de progresso |
| Sucatas / XP / REP | Só sucatas são creditadas ao concluir |
| Localização / Tempo / Horário / Clima / Bônus | Modal de detalhes |
| Taxa de sucesso % | Exibida no card |
| Expira em | Datetime picker opcional |
| Imagem | File picker (Storage `contract-images`) + URL manual |
| Facção | Dropdown — vincula o contrato a uma facção específica |

### Tabela de contratos

- **Imagem**: preview 40×40 + botão Upload inline por linha
- **Facção**: dropdown editável inline (salva imediatamente)
- **Ativo**: checkbox inline
- **Remover**: lixeira com confirmação

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar (inclui inativos) | `GET /api/admin/contratos` (createAdminClient) |
| Criar | `POST /api/admin/contratos` |
| Editar campo | `PATCH /api/admin/contratos/:id` — inclui `faction_id` |
| Upload imagem | `POST /api/admin/contratos/:id/image` → Storage `contract-images` |
| Remover | `DELETE /api/admin/contratos/:id` |

---

## Seção 2 — Aceitações de Contratos Individuais

Lista `user_contracts` com progresso e status de cada usuário.

- **Progresso**: input numérico inline, salva no change (`PATCH .../acceptances/:id`)
- **Concluir**: botão disponível só para status `active` → credita `profiles.points += sucatas`

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar | `GET /api/admin/contratos/acceptances` |
| Atualizar progresso | `PATCH /api/admin/contratos/acceptances/:id` |
| Concluir + creditar | `POST /api/admin/contratos/acceptances/:id/complete` |

---

## Seção 3 — Contratos Sequenciais de Facção

Contratos com sequências de missões diárias/semanais/mensais. Antigo nome interno: "passes de batalha" — agora chamados de **Contratos Sequenciais**.

### Criar contrato sequencial

Botão **Novo Contrato** expande formulário com:

| Campo | Descrição |
|---|---|
| Facção | Dropdown — vazio = contrato geral (aparece em `/contratos`); vinculado = exclusivo da facção |
| Tipo | `daily` (1 missão) \| `weekly` (7 missões) \| `monthly` (30 missões) |
| Título | — |
| Início + Expira em | Datetime pickers — passes com início futuro aparecem na vitrine mas só são ativados no `starts_at` |
| Preço em Sucatas | 0 = gratuito |
| Preço em R$ | 0 = sem pagamento PIX |
| Imagem | File picker + preview (Storage `contract-images` como `pass-{id}.ext`) + URL manual |

### Expander por contrato

Clique no contrato para expandir. Exibe:

**Dados do Contrato** (editáveis inline via blur/onChange):
- Título, Descrição, Preço em Sucatas, Preço em R$, Início, Expira em, Facção

**Imagem do contrato**: preview + botão "Alterar imagem"

**Missões** (lista + formulário de adição):

Cada missão na lista exibe:
- Número de posição (`Dia X`)
- Título (não editável — remova e recrie se precisar alterar)
- Total (meta)
- **Input de pontos editável** — salva no blur via `PATCH .../missions/:id`
- **Descrição editável** — clique no texto abaixo do título para editar inline (Enter salva, Escape cancela)
- **Item reward**: botão `+ Item` abre autocomplete de `catalog_items`; ao selecionar, salva `item_reward: { item_name, item_image, item_rarity, item_qty }` e zera pontos; ✕ para remover
- **Deletar**: lixeira com confirmação

**Formulário de nova missão**:
- `#` (posição auto-incremental), Título, Descrição (opcional), Total, Pontos → botão Add

### Item reward em missões

- Admin busca item no catálogo via autocomplete (usa `icon_url` do `catalog_items`)
- `item_image` salvo = imagem do item aparece dentro do círculo na trilha do usuário
- `item_rarity` salvo = borda do círculo na cor da raridade (azul/verde/amarelo/roxo/laranja)
- Missões com item têm `points_reward = 0` automaticamente

### Concluir missão de usuário

`POST /api/admin/faccoes/passes/missions/:id/complete` com body `{ user_id }`:
- Verifica limite diário (1 missão/dia para weekly e monthly)
- Cria registro em `user_mission_completions`
- Credita `points_reward` em `profiles.points`

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar grupos | `GET /api/admin/faccoes/passes` (createAdminClient — inclui inativos/futuros) |
| Criar grupo | `POST /api/admin/faccoes/passes` |
| Editar grupo | `PATCH /api/admin/faccoes/passes/:id` |
| Upload imagem do grupo | `POST /api/admin/faccoes/passes/:id/image` |
| Remover grupo | `DELETE /api/admin/faccoes/passes/:id` |
| Listar missões | `GET /api/admin/faccoes/passes/:id/missions` (createAdminClient) |
| Criar missão | `POST /api/admin/faccoes/passes/:id/missions` |
| Editar missão | `PATCH /api/admin/faccoes/passes/missions/:id` |
| Remover missão | `DELETE /api/admin/faccoes/passes/missions/:id` |
| Completar missão de usuário | `POST /api/admin/faccoes/passes/missions/:id/complete` |

---

## Seção 4 — Próximas Recompensas (por Pontos)

Itens do catálogo desbloqueados ao atingir determinada quantidade de sucatas acumuladas (`profiles.points`). Aparecem no painel lateral de `/contratos`.

### Adicionar recompensa

1. Digitar nome do item no campo de busca → autocomplete de `catalog_items` (até 20 resultados)
2. Definir o **limiar de pontos** (ex: 9.000 = precisa ter acumulado 9.000 pts)
3. Clicar no item no dropdown → inserção imediata

### Tabela de recompensas

- **Limiar**: input numérico inline editável (blur salva via PATCH)
- **Ativo**: checkbox inline (false = oculto no painel do usuário)
- **Remover**: lixeira com confirmação

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar | `GET /api/admin/contratos/rewards` |
| Criar | `POST /api/admin/contratos/rewards` — body: `{ item_id, points_threshold }` |
| Editar | `PATCH /api/admin/contratos/rewards/:id` — body: `{ points_threshold?, active? }` |
| Remover | `DELETE /api/admin/contratos/rewards/:id` |

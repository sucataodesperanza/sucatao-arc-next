# Admin — Contratos

**Rota:** `/admin/contratos`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento completo dos contratos ativos exibidos em `/contratos`, incluindo criação, edição de status e controle de progresso dos usuários.

---

## Seção 1 — Contratos

Tabela de todos os contratos (ativos e inativos). O GET usa `createAdminClient()` para bypassar a RLS e exibir contratos com `active = false`.

### Criar contrato

Botão **Novo Contrato** expande um formulário com todos os campos:

| Campo | Descrição |
|---|---|
| Tipo | `Principal` \| `Secundário` \| `Diário` \| `Facção` |
| Tier | `Básico` \| `Avançado` \| `Épico` \| `Lendário` |
| Risco Ambiental | `Baixo` \| `Médio` \| `Alto` \| `Extremo` (visual na modal) |
| Variante | Nenhuma \| `dourada` \| `holográfica` \| `corrompida` |
| Título | Exibido no card |
| Objetivo principal | Resumo no card (ex: "Elimine 5 ARC Sentinel") |
| Total | Denominador do progresso |
| Sucatas / XP / REP | Recompensas (só sucatas são creditadas ao concluir) |
| Localização / Tempo / Horário / Clima | Exibidos na modal de detalhes |
| Bônus condição + recompensa | Exibidos na modal |
| Taxa de sucesso % | Exibida no card |
| Expira em | Data/hora de expiração (opcional) |
| Imagem | File picker com preview + fallback de URL manual |

### Upload de imagem

1. Admin cria o contrato → formulário permanece aberto
2. Admin clica **Selecionar arquivo** → escolhe PNG/JPG/SVG
3. `POST /api/admin/contratos/:id/image` → upload para Storage `contract-images/{id}.ext`
4. `contracts.image_url` atualizado com a URL pública
5. Fallback: campo de URL manual para usar imagens de `/assets/`

### Editar / desativar

- **Ativo**: checkbox inline — desmarcar oculta o contrato de `/contratos` mas admin continua vendo
- **Remover**: botão lixeira com confirmação — remove o contrato e todas as aceitações

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar (inclui inativos) | `GET /api/admin/contratos` (usa `createAdminClient`) |
| Criar | `POST /api/admin/contratos` |
| Editar campo | `PATCH /api/admin/contratos/:id` |
| Upload imagem | `POST /api/admin/contratos/:id/image` |
| Remover | `DELETE /api/admin/contratos/:id` |

---

## Seção 2 — Aceitações de Contratos

Lista todas as aceitações (`user_contracts`) com nome do usuário, contrato, progresso e status.

### Atualizar progresso

- Campo numérico inline (0 → total do contrato)
- Salva imediatamente ao mudar o valor (`PATCH /api/admin/contratos/acceptances/:id`)
- Barra de progresso visual atualiza junto

### Concluir

- Botão **Concluir** disponível apenas para status `active`
- Ao confirmar: `status = completed`, `completed_at = now()`, `profiles.points += contracts.sucatas`
- Toast de confirmação com os pontos creditados

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar aceitações | `GET /api/admin/contratos/acceptances` |
| Atualizar progresso | `PATCH /api/admin/contratos/acceptances/:id` |
| Concluir + creditar | `POST /api/admin/contratos/acceptances/:id/complete` |

# Admin — Facções

**Rota:** `/admin/faccoes`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento das facções e do feed de atividades exibido na tela pública `/faccoes`.

---

## Seção 1 — Facções

Tabela com todas as facções (incluindo inativas). Cada linha é editável inline.

| Campo | Tipo | Como editar |
|---|---|---|
| Ícone | Imagem (Storage) | Botão Upload → upload para bucket `faction-icons` |
| Nome | Texto | Clique inline → editar → ✓ salvar |
| Tagline | Texto | Clique inline → editar → ✓ salvar |
| Cor | Color picker | Input `type=color` com atualização imediata |
| Ativo | Checkbox | Toggle imediato |
| Bônus | Textarea (1 por linha) | Clique → editar → Salvar |

### Fontes de Dados

| Conteúdo | Endpoint |
|---|---|
| Listar | `GET /api/admin/faccoes` |
| Editar campo | `PATCH /api/admin/faccoes/:id` |
| Upload ícone | `POST /api/admin/faccoes/:id/icon` |
| Remover facção | `DELETE /api/admin/faccoes/:id` |

---

## Seção 2 — Feed de Atividades

Gerencia as entradas do feed exibido no painel lateral de `/faccoes`.

- **Formulário**: seleciona a facção + digita o texto → botão Adicionar
- **Tabela**: lista as últimas 30 entradas com facção, texto, data/hora e botão remover

### Fontes de Dados

| Conteúdo | Endpoint |
|---|---|
| Listar atividades | `GET /api/admin/faccoes/activity` |
| Criar atividade | `POST /api/admin/faccoes/activity` |
| Remover atividade | `DELETE /api/admin/faccoes/activity/:id` |

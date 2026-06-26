# Admin — Facções

**Rota:** `/admin/faccoes`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento completo das facções: dados, ícones, atributos, bônus e feed de atividades globais.

---

## Seção 1 — Facções

Tabela com todas as facções (incluindo inativas). Cada linha é editável inline sem recarregar.

| Campo | Tipo | Como editar |
|---|---|---|
| Ícone | Imagem (Storage `faction-icons`) | Botão **Upload** → abre seletor de arquivo → envia para `/api/admin/faccoes/:id/icon` |
| Nome | Texto | Clique inline → editar → ✓ salvar |
| Tagline | Texto | Clique inline → editar → ✓ salvar |
| Cor | `#hex` | Color picker nativo — atualiza imediatamente ao mudar |
| Ativo | Checkbox | Toggle imediato (`true`/`false`) |
| Bônus | Textarea, 1 por linha | Clique → editar → **Salvar** (array salvo em `factions.bonuses` JSONB) |
| Atributos (1–3) | Botões numéricos | Clique no número desejado → salva em `factions.attributes` JSONB |

### Atributos disponíveis
`combate`, `recursos`, `comercio`, `tecnologia`, `sobrevivencia` — valores de 1 a 3.

### Ícones — fluxo técnico
1. Admin clica **Upload** na linha da facção
2. Seleciona arquivo (PNG, JPG, SVG)
3. `POST /api/admin/faccoes/:id/icon` (multipart/form-data)
4. Arquivo salvo em Storage `faction-icons` como `{id}.{ext}` com `upsert: true`
5. `factions.icon_url` atualizado com a URL pública
6. Os arquivos estáticos em `public/assets/faccoes/` são a fonte padrão; o Storage sobrescreve quando houver upload

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar | `GET /api/admin/faccoes` |
| Editar campo | `PATCH /api/admin/faccoes/:id` |
| Upload ícone | `POST /api/admin/faccoes/:id/icon` |
| Remover facção | `DELETE /api/admin/faccoes/:id` |

---

## Seção 2 — Feed de Atividades

Feed **global** das facções exibido no painel lateral de `/faccoes` (tela de seleção). Diferente de `user_faction_activity` — este feed é gerenciado manualmente pelo admin, não gerado pelo sistema.

- **Formulário**: seleciona facção + texto → **Adicionar**
- **Tabela**: últimas 30 entradas — facção (com cor), texto, data/hora, botão remover

### Fontes de Dados

| Ação | Endpoint |
|---|---|
| Listar | `GET /api/admin/faccoes/activity` |
| Criar | `POST /api/admin/faccoes/activity` — body: `{ faction_id, text }` |
| Remover | `DELETE /api/admin/faccoes/activity/:id` |

---

## Distinção: `faction_activity` vs `user_faction_activity`

| | `faction_activity` | `user_faction_activity` |
|---|---|---|
| **Quem cria** | Admin (manual) | Sistema (automático) |
| **Onde aparece** | Painel lateral de `/faccoes` (seleção) | Feed da facção + atividades recentes em `/faccoes/visao-geral` |
| **Tem user_id** | Não | Sim |
| **Gerenciado em** | `/admin/faccoes` | Gerado por eventos (ex: join, contratos) |

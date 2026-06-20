# Admin — Trades

**Rota:** `/admin/trades`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento completo do sistema de trades do Sucatão. Dividido em 3 seções: trades, slots de agendamento e aceitações dos usuários.

---

## Seção 1 — Trades do Sucatão

### Conteúdo

- **Botão "Novo trade"** — abre formulário inline
- **Formulário de criação/edição:**
  - Pontos oferecidos
  - Item desejado (autocomplete de `catalog_items`) + preview de imagem com auto-preenchimento de raridade e `icon_url`
  - Quantidade desejada
  - Raridade (auto-preenchida, editável para override)
  - Status (Ativo / Pausado / Concluído)
  - Data de expiração (opcional)
- **Tabela** — item, quantidade, raridade, pontos, seletor de status inline, expiração, remover

### Fontes de Dados

| Conteúdo | Tabela | Campo(s) | Endpoint |
|---|---|---|---|
| Lista de trades | `trades` | todos | `GET /api/admin/trades` |
| Criar | `trades` | `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity`, `status`, `expires_at` | `POST /api/admin/trades` |
| Editar / status | `trades` | campos editados + `updated_at` | `PATCH /api/admin/trades/:id` |
| Remover | `trades` | — | `DELETE /api/admin/trades/:id` |
| Lookup (auto-preenche) | `catalog_items` | `name`, `rarity`, `icon_url` | `GET /api/admin/catalog?q=nome` (debounce 450ms) |

---

## Seção 2 — Slots de Agendamento In-Game

### Conteúdo

- Formulário para criar slot: label (ex: "Sex 20/06 · 15:00 in-game"), data/hora (`datetime-local`), número de vagas
- Tabela de slots: label, data/hora formatada, vagas, toggle ativo/inativo, remover
- Slots inativos não aparecem para os usuários na tela de agendamento

### Fontes de Dados

| Conteúdo | Tabela | Campo(s) | Endpoint |
|---|---|---|---|
| Lista de slots | `trade_slots` | `id`, `label`, `scheduled_for`, `capacity`, `active` | `GET /api/admin/trades/slots` |
| Criar slot | `trade_slots` | `label`, `scheduled_for`, `capacity` | `POST /api/admin/trades/slots` |
| Ativar/desativar | `trade_slots` | `active` | `PATCH /api/admin/trades/slots/:id` |
| Remover | `trade_slots` | — | `DELETE /api/admin/trades/slots/:id` |

---

## Seção 3 — Aceitações

### Conteúdo

- Tabela de todas as aceitações (exceto canceladas) com:
  - Nome do usuário + Game ID informado
  - Trade (item desejado + pontos)
  - Slot agendado (label ou "Aguardando agendamento")
  - Status (Pendente / Agendado / Concluído)
  - Botão **"Concluir"** — aparece apenas para aceitações com status `scheduled`
- Ao clicar "Concluir":
  1. `trade_acceptances.status` → `completed`
  2. `profiles.points` do usuário recebe os pontos do trade automaticamente

### Fontes de Dados

| Conteúdo | Tabela | Campo(s) | Endpoint |
|---|---|---|---|
| Lista de aceitações | `trade_acceptances` + `trades` + `trade_slots` + `profiles` | todos | `GET /api/admin/trades/acceptances` |
| Concluir trade | `trade_acceptances` + `profiles` | `status`, `points` | `POST /api/admin/trades/acceptances/:id/complete` |

---

## Fluxo Completo (Admin)

```
1. Admin cria trade  →  aparece na home pública
2. Admin cria slots  →  aparecem para usuários no agendamento
3. Usuário aceita    →  aparece em Aceitações como "Pendente"
4. Usuário agenda    →  status → "Agendado", game_id salvo
5. Admin conclui     →  status → "Concluído", pontos creditados
```

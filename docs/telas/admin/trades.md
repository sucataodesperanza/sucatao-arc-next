# Admin — Trades

**Rota:** `/admin/trades`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento dos trades do Sucatão. Permite criar, editar, pausar e remover trades que aparecem na home e na tela `/trades`.

## Conteúdo Visível

- **Botão "Novo trade"** — abre formulário inline
- **Formulário de criação/edição:**
  - Pontos oferecidos (número)
  - Item desejado (texto com autocomplete de `catalog_items`) + preview de imagem e lookup automático de raridade e `icon_url`
  - Quantidade desejada
  - Raridade (auto-preenchida ao selecionar item, editável para override)
  - Status (Ativo / Pausado / Concluído)
  - Data de expiração (opcional)
- **Tabela de trades** — item, quantidade, raridade colorida, pontos, seletor de status inline, data de expiração, botão remover

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de trades | `trades` | todos os campos | `GET /api/admin/trades` |
| Criar trade | `trades` | `offer_points`, `want_item_name`, `want_item_qty`, `want_item_icon`, `want_item_rarity`, `status`, `expires_at` | `POST /api/admin/trades` |
| Editar / mudar status | `trades` | campos editados + `updated_at` | `PATCH /api/admin/trades/:id` |
| Remover | `trades` | — | `DELETE /api/admin/trades/:id` |
| Lookup de raridade e ícone | `catalog_items` | `name`, `rarity`, `icon_url` | `GET /api/admin/catalog?q=nome&pageSize=10` (debounce 450ms) |
| Autocomplete de itens | `catalog_items` | `name` | mesmo endpoint acima |

## Comportamento de Auto-preenchimento

Ao digitar o nome do item:
1. Debounce de **450ms**
2. Busca `GET /api/admin/catalog?q={nome}` (admin client)
3. Se encontrar match exato por nome → preenche automaticamente `want_item_rarity` e `want_item_icon`
4. Admin pode corrigir a raridade manualmente se necessário
5. Limpar o nome reseta raridade e ícone

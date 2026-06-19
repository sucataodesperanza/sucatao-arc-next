# Admin — Cupons

**Rota:** `/admin/cupons`  
**Requer autenticação:** Sim (admin)

## Descrição

Gerenciamento de cupons de desconto. Permite criar, editar, ativar/desativar e remover cupons usados no checkout.

## Conteúdo Visível

- **Busca** por código
- **Stats** — cupons ativos, total de usos, valor total descontado
- **Tabela** — código, desconto (% ou R$), uso (X/limite), valor descontado, validade, status, ações
- **Modal criar/editar** — código (com geração aleatória), tipo de desconto, valor, limite de uso, data de expiração, status ativo/inativo

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de cupons | `coupons` | `id`, `code`, `discount_type`, `discount_value`, `max_uses`, `uses`, `expires_at`, `active`, `total_discounted` | `GET /api/admin/coupons?q=...` |
| Criar cupom | `coupons` | todos os campos | `POST /api/admin/coupons` |
| Editar/status | `coupons` | campos editados | `PATCH /api/admin/coupons/:id` |
| Remover | `coupons` | — | `DELETE /api/admin/coupons/:id` |

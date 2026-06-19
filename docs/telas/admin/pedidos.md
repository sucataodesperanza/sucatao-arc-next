# Admin — Pedidos

**Rota:** `/admin/pedidos`  
**Requer autenticação:** Sim (admin)

## Descrição

Visualização e gerenciamento de todos os pedidos do site. Permite buscar por ID, cliente ou item e filtrar por status.

## Conteúdo Visível

- **Busca** — por ID do pedido, nome/email do cliente ou nome do item
- **Filtros** — status do pedido e status de pagamento
- **Tabela paginada** — ID curto, nome + email do cliente, status, horário, dia
- **Modal de detalhe** — ID completo, nome, email, game_id, badges de status/pagamento/método, datas (criação, pagamento, cancelamento), lista de itens com imagem e total por item, total do pedido

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Lista de pedidos | `orders` | `id`, `user_id`, `total`, `status`, `payment_method`, `payment_status`, `items` (jsonb), `created_at`, `paid_at`, `cancelled_at`, `customer_name`, `customer_email`, `customer_game_id` | `GET /api/admin/orders?page&pageSize&q&status&paymentStatus` |

## Valores de Status

| Campo | Valores possíveis |
|---|---|
| `status` | `pending`, `processing`, `completed`, `cancelled` |
| `payment_status` | `pending`, `paid`, `failed`, `refunded` |
| `payment_method` | `points`, `pix` |

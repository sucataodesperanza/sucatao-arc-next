# Pedido Confirmado

**Rota:** `/pedido-confirmado?ids=uuid1,uuid2,...`  
**Requer autenticação:** Sim

## Descrição

Página de confirmação exibida após a conclusão de um pedido. Recebe os IDs dos pedidos via query string e exibe o resumo de cada um.

## Conteúdo Visível

- **Card por pedido** — lista de itens com imagem e quantidade, método de pagamento, status, total e data
- **Aviso PIX pendente** — se algum pedido ainda aguarda pagamento, exibe botão "Verificar pagamento"
- **Links de ação** — "Continuar comprando" (→ `/loja`) e "Ver no perfil" (→ `/perfil`)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Dados dos pedidos | `orders` | `id`, `status`, `payment_method`, `payment_status`, `total`, `items` (jsonb), `created_at` | `supabase.from("orders").select("*").in("id", ids)` |
| Verificação PIX | API | — | `POST /api/store/sync-payment` |

## Notas

> Os IDs dos pedidos chegam pela URL (`?ids=uuid1,uuid2`). Se nenhum ID for fornecido, a página exibe uma mensagem de pedido não encontrado.

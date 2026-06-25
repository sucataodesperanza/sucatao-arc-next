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
| Verificação PIX pendente | API | — | `POST /api/store/sync-payment` (só para ordens pending/processing) |
| **Reconciliação do inventário** | `orders` + `user_inventory` | — | `POST /api/inventory/reconcile` (background, sempre) |

## Comportamento ao Montar

Ao chegar nesta página, dois processos rodam em paralelo:
1. **`syncOrder`** — verifica MercadoPago para pedidos PIX ainda pendentes (máx. 1x por orderId por sessão via `syncedRef`)
2. **`reconcile`** — chama `POST /api/inventory/reconcile` em background para garantir que todos os itens pagos entrem no inventário, mesmo se `addItemsToInventory` falhou em alguma etapa anterior

## Notas

- IDs dos pedidos chegam pela URL `?ids=uuid1,uuid2`. Se vazio: exibe "pedido não encontrado"
- `router.replace` (não `push`) é usado para navegar para cá — evita que `/pagar/[id]` fique no histórico e crie loop de redirect

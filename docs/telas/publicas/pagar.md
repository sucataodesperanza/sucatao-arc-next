# Pagamento PIX

**Rota:** `/pagar/[id]`  
**Requer autenticação:** Sim

## Descrição

Tela de pagamento via PIX para pedidos gerados na loja. Exibe o QR Code e o código copia-e-cola com countdown de expiração.

## Conteúdo Visível

- **QR Code PIX** — imagem base64 gerada pelo gateway
- **Código copia-e-cola** — botão de copiar
- **Countdown** — tempo restante até expiração (calculado a partir de `pix_expires_at`)
- **Status** — carregando / aguardando pagamento / pago / expirado

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Dados do pedido | `orders` | `id`, `total`, `status`, `payment_status`, `pix_code`, `pix_qr_code_base64`, `pix_expires_at` | `supabase.from("orders").select(...).eq("id", id)` |
| Verificação de pagamento | API | — | `POST /api/store/sync-payment` |

## Fluxo de Estados

```
carregando → aguardando_pagamento → pago (→ /pedido-confirmado)
                                  ↘ expirado / falhou
```

- A tela faz polling periódico via `sync-payment` para verificar se o PIX foi pago
- Ao confirmar pagamento, redireciona automaticamente para `/pedido-confirmado?ids=...`

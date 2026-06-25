# Inventário

**Rota:** `/inventario`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Inventário pessoal do usuário. Exibe todos os itens adquiridos via compras na loja, com histórico de aquisições e capacidade expansível por pacotes de slots.

## Abas

| Aba | Status | Conteúdo |
|---|---|---|
| **Visão Geral** | ✅ Ativo | Stats + grid de itens + filtro por categoria |
| **Histórico** | ✅ Ativo | Log cronológico de aquisições com origem |
| **Coleções** | 🔜 Em breve | — |

## Aba: Visão Geral

- **Topbar** — título + carteira (pontos com botão "+")
- **Stats** — total de itens, raros, épicos, lendários, valor estimado
- **Filtros visuais** — busca, raridade, ordenação (não funcionais ainda)
- **Category pills** — Todos, Armas, Equipamentos, Recursos, Componentes, Outros (funcionais)
- **Grid 6 colunas** — cards com badge de raridade, imagem (`catalog_items.icon_url`), quantidade, nome, categoria e valor
- **Estado vazio** — reconciliação automática + botão manual "↻ Sincronizar com compras"

## Aba: Histórico

- Lista cronológica dos eventos de aquisição (mais recente no topo)
- Agrupada por data ("terça-feira, 24 de junho")
- Cada linha: ícone do item + nome + tipo + badge de origem + quantidade `+X` + horário
- Carregamento lazy (só busca quando a aba é aberta)
- Limite: 100 entradas mais recentes

**Badges de origem:**

| Badge | Cor | Quando aparece |
|---|---|---|
| Compra com pontos | Amarelo | Checkout com pontos |
| Compra via PIX | Verde | PIX aprovado pelo MercadoPago |
| Trade | Azul | Trade concluído (fase futura) |
| Sincronização | Cinza | `POST /api/inventory/reconcile` |
| Admin | Vermelho | Inserção manual pelo admin |

## Painel Lateral

- `SidePanelUserHeader` (com reputação)
- **Resumo** — donut chart SVG por raridade + legenda
- **Mais valiosos** — top 5 por valor
- **Capacidade** — barra de uso + botões de compra de slots
- **↻ Sincronizar com compras** — sempre visível; reconcilia inventário com pedidos pagos
- **Ações rápidas** — Entregar Itens, Ver Loja, Transferir, Favoritos

## Fontes de Dados

| Conteúdo | Tabela | Campo(s) | Endpoint |
|---|---|---|---|
| Itens do inventário | `user_inventory` + `catalog_items` | `quantity`, `acquired_at` + campos do item | `GET /api/inventory` |
| Capacidade atual | `profiles` | `inventory_capacity` | incluído no `GET /api/inventory` |
| Histórico de aquisições | `inventory_history` + `catalog_items` | `quantity`, `source`, `acquired_at` + campos do item | `GET /api/inventory/history` |
| Pontos (carteira) | `profiles` | `points` | `supabase.from("profiles").select("points")` |
| Reconciliação | `orders` + `user_inventory` | `items`, `payment_status` | `POST /api/inventory/reconcile` |
| Expansão de slots (pontos) | `profiles` | `points`, `inventory_capacity` | `POST /api/inventory/expand` com `{ mode: "points" }` |

## Sistema de Capacidade

- **Capacidade inicial**: 100 slots (tipos únicos de item)
- **Pacote**: +25 slots por compra
- **Preço em pontos**: escalonado — 1º pacote=10k, 2º=20k, 3º=30k pts...
- **Preço em BRL**: R$5/pacote nos primeiros 100 extras; +R$5 a cada 100 slots adicionais
- PIX para slots em desenvolvimento (placeholder)

## Como Itens Entram no Inventário

| Origem | Quando | Mecanismo |
|---|---|---|
| Compra com pontos | Imediato após checkout | `addItemsToInventory(userId, items, "points")` em `POST /api/store/checkout` |
| Compra com PIX | Quando pagamento confirmado (status pending→paid) | `addItemsToInventory(userId, items, "pix")` em `POST /api/store/sync-payment` |
| **Toda confirmação de pedido** | Ao chegar em `/pedido-confirmado` | `POST /api/inventory/reconcile` chamado em background (safety net) |
| Manual | Botão "↻ Sincronizar" no inventário | `POST /api/inventory/reconcile` |

> **Idempotência**: `addItemsToInventory` usa upsert — insere ou incrementa `quantity`. O `sync-payment` só adiciona ao inventário quando o status MUDA para `paid` (guarda com `order.payment_status !== "paid"`).

## Estados Especiais

- **Inventário vazio**: reconciliação automática ao montar o componente
- **Painel fechado**: salvo em `localStorage` (chave `inventario-panel-open`)

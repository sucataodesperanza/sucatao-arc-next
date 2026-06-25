# Inventário

**Rota:** `/inventario`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Inventário pessoal do usuário. Exibe todos os itens adquiridos via compras na loja, com capacidade expansível por pacotes de slots. Dados reais do banco — sem mock.

## Conteúdo Visível

### Abas
- **Visão Geral** (padrão) — conteúdo completo descrito abaixo
- **Itens**, **Histórico**, **Coleções** — "Em breve" (placeholder)

> Futuramente: itens de recompensa de contratos (/contratos) terão aba própria separada do inventário principal.

### Topbar
- Título "Inventário" + botão de ajuda
- **Carteira** — saldo de pontos (`profiles.points`) com botão "+"

### Stats (derivados dos dados reais)
- Itens totais (soma de quantidades) + itens únicos
- Raros, Épicos e Lendários com percentual do total
- Valor estimado total

### Filtros
- Busca por nome (visual, não funcional ainda)
- Selects de raridade, categoria, ordenação (visuais)

### Grade de categorias
- Pills: Todos, Armas, Equipamentos, Recursos, Componentes, Outros
- Categorias derivadas automaticamente de `catalog_items.item_type`

### Grid de itens (6 colunas)
- Cards com badge de raridade colorido, imagem do item (`catalog_items.icon_url`), quantidade, nome, categoria e valor

### Estado vazio
- Mensagem "Seu inventário está vazio"
- **Reconciliação automática**: ao detectar inventário vazio, chama `POST /api/inventory/reconcile` para recuperar itens de compras pagas anteriores
- Botão manual "↻ Sincronizar com compras" para forçar reconciliação

### Painel lateral
- `SidePanelUserHeader` (com reputação)
- **Resumo do Inventário** — donut chart SVG (sem biblioteca externa) por raridade
- **Mais valiosos** — top 5 itens por valor
- **Capacidade do Inventário** — barra de uso + botões de compra de slots
- **Ações rápidas** — Entregar Itens (→ /loja), Ver Loja (→ /loja), Transferir e Favoritos (Em breve)

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens do inventário | `user_inventory` + `catalog_items` | `quantity`, `acquired_at`, + todos os campos do item | `GET /api/inventory` |
| Capacidade atual | `profiles` | `inventory_capacity` | incluído no `GET /api/inventory` |
| Pontos do usuário (carteira) | `profiles` | `points` | `supabase.from("profiles").select("points")` |
| Reconciliação com compras | `orders` | `items`, `payment_status` | `POST /api/inventory/reconcile` |
| Expansão de slots (pontos) | `profiles` | `points`, `inventory_capacity` | `POST /api/inventory/expand` com `{ mode: "points" }` |

## Sistema de Capacidade

- **Capacidade inicial**: 100 slots (tipos de item únicos)
- **Pacote de expansão**: +25 slots por compra
- **Preço em pontos** (escalonado por pacote): 1º=10k, 2º=20k, 3º=30k, ...
- **Preço em BRL**: R$5 por pacote nos primeiros 100 extras; sobe R$5 a cada 100 extras adicionais
- Barra de uso fica amarela acima de 70%, vermelha acima de 90%
- Pagamento via PIX para slots: placeholder (fase 2)

## Como Itens Entram no Inventário

| Origem | Quando | Mecanismo |
|---|---|---|
| Compra com pontos | No ato do checkout | `addItemsToInventory()` chamado em `POST /api/store/checkout` |
| Compra com PIX | Quando pagamento é confirmado | `addItemsToInventory()` chamado em `POST /api/store/sync-payment` (apenas na primeira confirmação) |
| Compras antigas (retroativo) | Ao abrir inventário vazio | `POST /api/inventory/reconcile` (automático) |

> **Regra de idempotência**: `addItemsToInventory` usa upsert — se o item já existe, incrementa quantidade; senão, insere. O `sync-payment` só adiciona ao inventário quando o status MUDA para `paid`, evitando duplicatas.

## Estados Especiais

- **Carregando**: skeleton nos cards
- **Inventário vazio**: reconciliação automática ao montar o componente
- **Painel fechado**: estado salvo em `localStorage` (chave `inventario-panel-open`)

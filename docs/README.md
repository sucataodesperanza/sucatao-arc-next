# Documentação — Sucatão de Speranza

Documentação técnica e funcional das telas do site ARC Raiders.

## Estrutura

```
docs/
└── telas/
    ├── publicas/    → 16 telas acessíveis pelos usuários
    └── admin/       → 8 telas do painel administrativo
```

## Telas Públicas

> **Atenção:** O middleware (`src/proxy.ts`) protege **todas** as rotas. Qualquer usuário não autenticado é redirecionado para `/login` independente da tela. As únicas rotas livres são: `/login`, `/registro`, `/recuperar-senha`, `/completar-cadastro`, `/atualizar-senha` e `/confirmar-email`.

| Tela | Rota | Dados principais |
|---|---|---|
| [Início](telas/publicas/inicio.md) | `/` | arc-data, profiles |
| [Loja](telas/publicas/loja.md) | `/loja` | catalog_items, stock_items, profiles |
| [Itens](telas/publicas/itens.md) | `/itens` | catalog_items, arc-data |
| [Crafting](telas/publicas/crafting.md) | `/crafting` | catalog_items |
| [Arcpedia](telas/publicas/arcpedia.md) | `/arcpedia` | arcs |
| [ARC Intel](telas/publicas/arcs.md) | `/arcs` | arc-data (local) |
| [Trades](telas/publicas/trades.md) | `/trades` | hardcoded |
| [Facções](telas/publicas/faccoes.md) | `/faccoes` | hardcoded |
| [Contratos](telas/publicas/contratos.md) | `/contratos` | hardcoded |
| [Mapas](telas/publicas/mapas.md) | `/mapas` | arc-data, map-markers |
| [Reciclagem](telas/publicas/reciclagem.md) | `/reciclagem` | arc-data (local) |
| [Meu Perfil](telas/publicas/perfil.md) | `/perfil` | profiles, Storage |
| [Perfil Público](telas/publicas/perfil-publico.md) | `/perfil/[id]` | profiles, seller_inventory |
| [Carrinho](telas/publicas/carrinho.md) | `/carrinho` | profiles, CartContext |
| [Pagamento PIX](telas/publicas/pagar.md) | `/pagar/[id]` | orders |
| [Pedido Confirmado](telas/publicas/pedido-confirmado.md) | `/pedido-confirmado` | orders |

## Telas Admin

| Tela | Rota | Dados principais |
|---|---|---|
| [Dashboard](telas/admin/dashboard.md) | `/admin` | Redireciona para /admin/catalogo |
| [Catálogo](telas/admin/catalogo.md) | `/admin/catalogo` | catalog_items |
| [Estoque](telas/admin/estoque.md) | `/admin/estoque` | stock_items, catalog_items |
| [Crafting](telas/admin/crafting.md) | `/admin/crafting` | catalog_items |
| [Arcpedia](telas/admin/arcpedia.md) | `/admin/arcpedia` | arcs |
| [Cupons](telas/admin/cupons.md) | `/admin/cupons` | coupons |
| [Loot Boxes](telas/admin/loot-boxes.md) | `/admin/loot-boxes` | loot_boxes |
| [Pedidos](telas/admin/pedidos.md) | `/admin/pedidos` | orders, profiles |

## Banco de Dados (Supabase)

Tabelas principais usadas no site:

| Tabela | Propósito |
|---|---|
| `catalog_items` | Catálogo de itens (sincronizado via MetaForge) |
| `stock_items` | Estoque da loja (subset do catálogo à venda) |
| `arcs` | Inimigos ARC (sincronizados via MetaForge) |
| `orders` | Pedidos dos usuários |
| `profiles` | Perfis dos usuários (points, avatar, game_id, etc.) |
| `coupons` | Cupons de desconto |
| `loot_boxes` | Configuração das loot boxes |
| `seller_inventory` | Inventário de vendedores parceiros |

## Fontes de Dados Locais

| Arquivo | Conteúdo | Usado em |
|---|---|---|
| `src/data/arc-data.js` | 567 itens, 17 bots, 7 mapas | arcs, arcpedia (drops), mapas, reciclagem, home |
| `src/data/map-markers.js` | Marcadores de mapa por categoria | /mapas |

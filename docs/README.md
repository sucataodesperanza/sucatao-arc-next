# Documentação — Sucatão de Speranza

Documentação técnica e funcional das telas do site ARC Raiders.

## Estrutura

```
docs/
├── telas/
│   ├── publicas/    → 16 telas acessíveis pelos usuários
│   └── admin/       → 9 telas do painel administrativo
└── apis/
    └── trades.md    → endpoints do sistema de trades
```

## Telas Públicas

> **Atenção:** O middleware (`src/proxy.ts`) protege **todas** as rotas. Qualquer usuário não autenticado é redirecionado para `/login` independente da tela. As únicas rotas livres são: `/login`, `/registro`, `/recuperar-senha`, `/completar-cadastro`, `/atualizar-senha` e `/confirmar-email`.

| Tela | Rota | Dados principais |
|---|---|---|
| [Início](telas/publicas/inicio.md) | `/` | arc-data, profiles |
| [Loja](telas/publicas/loja.md) | `/loja` | catalog_items, stock_items, reward_items, profiles |
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
| [Trades](telas/admin/trades.md) | `/admin/trades` | trades |
| [Crafting](telas/admin/crafting.md) | `/admin/crafting` | catalog_items |
| [Arcpedia](telas/admin/arcpedia.md) | `/admin/arcpedia` | arcs |
| [Cupons](telas/admin/cupons.md) | `/admin/cupons` | coupons |
| [Loot Boxes](telas/admin/loot-boxes.md) | `/admin/loot-boxes` | loot_boxes |
| [Recompensas](telas/admin/recompensas.md) | `/admin/recompensas` | reward_items, Storage |
| [Pedidos](telas/admin/pedidos.md) | `/admin/pedidos` | orders, profiles |

## Banco de Dados (Supabase)

Tabelas principais usadas no site:

| Tabela | Propósito |
|---|---|
| `catalog_items` | Catálogo de itens (sincronizado via MetaForge) |
| `stock_items` | Estoque da loja (subset do catálogo à venda) |
| `arcs` | Inimigos ARC (sincronizados via MetaForge) |
| `trades` | Trades criados pelo Sucatão (pontos × item desejado) |
| `trade_acceptances` | Registro de usuários que aceitaram um trade (com slot e game_id) |
| `trade_slots` | Slots de agendamento in-game criados pelo admin |
| `reward_items` | Itens de recompensa (gift cards, merch, sorteios) gerenciados pelo admin |
| `orders` | Pedidos dos usuários |
| `profiles` | Perfis dos usuários (points, avatar, game_id, etc.) |
| `coupons` | Cupons de desconto |
| `loot_boxes` | Configuração das loot boxes |
| `seller_inventory` | Inventário de vendedores parceiros |

## Storage (Supabase)

| Bucket | Acesso | Usado em |
|---|---|---|
| `avatars` | Público · upload restrito ao próprio usuário | Upload de foto de perfil |
| `reward-images` | Público · upload restrito a admins | Imagens dos itens de recompensa |

## Infraestrutura Admin

### Sistema de notificações (`AdminNotificationsProvider`)

Todas as páginas admin têm acesso a toasts e modais de confirmação via contexto:

```ts
const toast         = useToast()      // toast.success / toast.error / toast.info
const { confirm }   = useConfirm()    // await confirm("Mensagem?") → boolean
```

- **Toasts** — aparecem no canto inferior direito, auto-fecham em 4.5s, têm ícone por tipo (✓ erro ⚠ info)
- **Confirm dialog** — substitui `window.confirm()` com modal estilizado; resolve `true` ou `false`
- Todos os `patchItem` (toggles inline) mostram toast ao salvar e revertem visualmente em caso de erro

## Documentação de APIs

| Arquivo | Conteúdo |
|---|---|
| [apis/trades.md](apis/trades.md) | Todos os endpoints do sistema de trades (público + admin) |

## Fontes de Dados Locais

| Arquivo | Conteúdo | Usado em |
|---|---|---|
| `src/data/arc-data.js` | 567 itens, 17 bots, 7 mapas | arcs, arcpedia (drops), mapas, reciclagem, home |
| `src/data/map-markers.js` | Marcadores de mapa por categoria | /mapas |

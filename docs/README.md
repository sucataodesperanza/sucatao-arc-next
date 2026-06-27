# Documentação — Sucatão de Speranza

Documentação técnica e funcional das telas do site ARC Raiders.

## Estrutura

```
docs/
├── telas/
│   ├── publicas/    → 15 telas acessíveis pelos usuários
│   └── admin/       → 11 telas do painel administrativo
└── apis/
    ├── trades.md    → endpoints do sistema de trades
    └── inventory.md → endpoints do inventário
```

## Telas Públicas

> **Atenção:** O middleware (`src/proxy.ts`) usa `getSession()` (sem chamada de rede) e protege **todas** as rotas. Qualquer usuário não autenticado é redirecionado para `/login`. Rotas livres: `/login`, `/registro`, `/recuperar-senha`, `/completar-cadastro`, `/atualizar-senha` e `/confirmar-email`.

A ordem abaixo segue a **sidebar de navegação** do site:

| # | Tela | Rota | Dados principais |
|---|---|---|---|
| 1 | [Início](telas/publicas/inicio.md) | `/` | trades, profiles |
| 2 | [Loja](telas/publicas/loja.md) | `/loja` | catalog_items, stock_items, reward_items, profiles |
| 3 | [Inventário](telas/publicas/inventario.md) | `/inventario` | user_inventory, inventory_history, profiles |
| 4 | [Trades](telas/publicas/trades.md) | `/trades` | trades, trade_acceptances, trade_settings |
| 5 | [Facções — Seleção](telas/publicas/faccoes.md) | `/faccoes` | factions, user_factions, faction_activity, Storage `faction-icons` |
| — | [Facções — Visão Geral](telas/publicas/faccoes-visao-geral.md) | `/faccoes/visao-geral` | factions, user_factions, user_faction_activity, profiles |
| 6 | [Contratos](telas/publicas/contratos.md) | `/contratos` | hardcoded |
| 7 | [Crafting](telas/publicas/crafting.md) | `/crafting` | catalog_items |
| 8 | [Reciclagem](telas/publicas/reciclagem.md) | `/reciclagem` | arc-data (local) |
| 9 | [Mapas](telas/publicas/mapas.md) | `/mapas` | arc-data, map-markers |
| 10 | [Arcpedia](telas/publicas/arcpedia.md) | `/arcpedia` | arcs |
| — | [ARC Intel](telas/publicas/arcs.md) | `/arcs` | arc-data (local) |
| — | [Meu Perfil](telas/publicas/perfil.md) | `/perfil` | profiles, Storage |
| — | [Perfil Público](telas/publicas/perfil-publico.md) | `/perfil/[id]` | profiles, seller_inventory |
| — | [Carrinho](telas/publicas/carrinho.md) | `/carrinho` | profiles, CartContext |
| — | [Pagamento PIX](telas/publicas/pagar.md) | `/pagar/[id]` | orders |
| — | [Pedido Confirmado](telas/publicas/pedido-confirmado.md) | `/pedido-confirmado` | orders, inventory |

## Telas Admin

| Tela | Rota | Dados principais |
|---|---|---|
| [Dashboard](telas/admin/dashboard.md) | `/admin` | Redireciona para /admin/catalogo |
| [Catálogo](telas/admin/catalogo.md) | `/admin/catalogo` | catalog_items |
| [Estoque](telas/admin/estoque.md) | `/admin/estoque` | stock_items, catalog_items |
| [Trades](telas/admin/trades.md) | `/admin/trades` | trades, trade_acceptances, trade_settings |
| [Crafting](telas/admin/crafting.md) | `/admin/crafting` | catalog_items |
| [Facções](telas/admin/faccoes.md) | `/admin/faccoes` | factions, user_factions, faction_activity |
| [Arcpedia](telas/admin/arcpedia.md) | `/admin/arcpedia` | arcs |
| [Cupons](telas/admin/cupons.md) | `/admin/cupons` | coupons |
| [Loot Boxes](telas/admin/loot-boxes.md) | `/admin/loot-boxes` | loot_boxes |
| [Recompensas](telas/admin/recompensas.md) | `/admin/recompensas` | reward_items, Storage |
| [Pedidos](telas/admin/pedidos.md) | `/admin/pedidos` | orders, profiles |

## Banco de Dados (Supabase)

| Tabela | Propósito |
|---|---|
| `catalog_items` | Catálogo de itens (sincronizado via MetaForge) |
| `stock_items` | Estoque da loja (subset do catálogo à venda) |
| `arcs` | Inimigos ARC (sincronizados via MetaForge) |
| `factions` | Facções disponíveis (nome, tagline, descrição, cor, icon_url, bonuses JSONB, attributes JSONB, position) |
| `user_factions` | Filiação do usuário a uma facção (UNIQUE user_id — escolha permanente) |
| `faction_activity` | Feed global de atividades das facções (gerenciado pelo admin via `/admin/faccoes`) |
| `user_faction_activity` | Atividades por usuário dentro da facção (geradas pelo sistema: join, contratos, entregas) |
| `trades` | Trades criados pelo Sucatão (pontos × item desejado) |
| `trade_acceptances` | Registro de aceitações de trade (scheduled_at, game_id, status) — 1 ativa por trade |
| `trade_settings` | Singleton com horário de funcionamento dos trades (operating_hours_start/end) |
| `reward_items` | Itens de recompensa (gift cards, merch, sorteios) |
| `user_inventory` | Inventário do jogador (`user_id + item_id FK → catalog_items + quantity`) |
| `inventory_history` | Log append-only de cada evento de aquisição de item |
| `orders` | Pedidos dos usuários |
| `profiles` | Perfis dos usuários (points, avatar, game_id, cpf, inventory_capacity) |
| `coupons` | Cupons de desconto |
| `loot_boxes` | Configuração das loot boxes |
| `seller_inventory` | Inventário de vendedores parceiros |

## Storage (Supabase)

| Bucket | Acesso | Usado em |
|---|---|---|
| `avatars` | Público · upload restrito ao próprio usuário | Upload de foto de perfil |
| `reward-images` | Público · upload restrito a admins | Imagens dos itens de recompensa |
| `faction-icons` | Público · upload restrito a admins | Ícones das facções (override do `/assets/faccoes/` estático) |

## Infraestrutura Admin

### Sistema de notificações (`AdminNotificationsProvider`)

Todas as páginas admin têm acesso a toasts e modais via contexto:

```ts
const toast         = useToast()      // toast.success / toast.error / toast.info
const { confirm }   = useConfirm()    // await confirm("Mensagem?") → boolean
```

- **Toasts** — canto inferior direito, auto-fecham em 4.5s
- **Confirm dialog** — substitui `window.confirm()` com modal estilizado
- Toggles inline mostram toast ao salvar e revertem em caso de erro

## Documentação de APIs

| Arquivo | Conteúdo |
|---|---|
| [apis/trades.md](apis/trades.md) | Sistema de trades: aceitação, agendamento, slots, conclusão |
| [apis/inventory.md](apis/inventory.md) | Inventário: listar, histórico, expandir slots, reconciliar |

## Fontes de Dados Locais

| Arquivo | Conteúdo | Usado em |
|---|---|---|
| `src/data/arc-data.js` | 567 itens, 17 bots, 7 mapas | arcs, arcpedia, mapas, reciclagem, home |
| `src/data/map-markers.js` | Marcadores de mapa por categoria | /mapas |

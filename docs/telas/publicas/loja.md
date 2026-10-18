# Loja do Sucatão

**Rota:** `/loja`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Loja principal do site. Exibe itens do catálogo ARC Raiders à venda e itens de recompensa especiais (gift cards, merch, sorteios) gerenciados pelo admin.

## Conteúdo Visível

### Aba Destaques (padrão)
- Banner hero com imagem de fundo e chamada para ação
- **Itens em destaque** — grid de até 5 itens do catálogo (`catalog_items` com `featured = true`)
- Cards de categorias do site

### Categorias da vitrine
- Navegação principal: Destaques, Loadouts, Armas, Consumíveis, Granadas e Materiais.
- Cards de categoria sem fotos por enquanto; as imagens serão fornecidas depois.
- Armas: `isWeapon` ou tipo `Weapon`; projetos são excluídos.
- Consumíveis: tipo `Consumable` e itens de cura, vigor e escudo classificados como `Quick Use`.
- Granadas: `Grenade`, `Throwable` e granadas de `Quick Use` identificadas pelo nome; armadilhas e projetos são excluídos.
- Materiais: `Material`, `Basic Material`, `Advanced Material`, `Refined Material` e `Topside Material`.
- Loadouts: montador interativo com MK3 Sobrevivente, descrito abaixo.
- Armas, Consumíveis, Granadas e Materiais mantêm busca, raridade, tipo, favoritos, ordenação e modal de compra. Loadouts usa seleção por espaço. Trocar de aba limpa os filtros.
- Links diretos: `/loja?tab=armas`, `/loja?tab=consumiveis`, `/loja?tab=granadas`, `/loja?tab=materiais`, `/loja?tab=loadouts`.

### Aba Todos os itens
- Filtros: busca por nome, raridade, tipo, ordenação e filtro por drops de bots
- Grid paginado de todos os itens com modal de detalhe

### Demais abas
- Contratos à Venda: lista contratos disponíveis e mantém o fluxo de aquisição existente.
- Sorteios: componente próprio com os sorteios da loja.
- Leilões e Gift Cards: permanecem disponíveis na navegação existente; nenhuma integração de pagamento nova foi adicionada.

### Painel lateral
- Header do usuário (avatar, nome, saldo de pontos), reputação e badge Mercador
- **Destaques da semana** — itens de recompensa gerenciados pelo admin (`reward_items` com `featured = true`); timer de countdown até o `expires_at` mais próximo

## Fontes de Dados

| Conteúdo | Tabela / Fonte | Campo(s) | Endpoint / Query |
|---|---|---|---|
| Itens em destaque (grid principal) | `stock_items` + `catalog_items` | `featured`, `name`, `icon_url`, `rarity`, `item_type`, `value` | `GET /api/catalog` |
| Grid de itens (aba Itens) | `stock_items` + `catalog_items` | todos os campos | `GET /api/catalog` |
| **Destaques da semana** (painel) | `reward_items` | `id`, `name`, `image_url`, `price`, `stock`, `expires_at` | `GET /api/loja/weekly` (filtra `featured = true` e `active = true`) |
| Pontos do usuário | `profiles` | `points` | `supabase.from("profiles").select("points")` |
| Avatar e nome | `profiles` + `auth` | `avatar_url`, `user_metadata.name` | `supabase.auth.getUser()` + `profiles` |
| Drops dos bots (filtro ARC Intel) | `arc-data.js` (local) | `bots[].drops`, `bots[].name` | — |

## Lógica dos Destaques

**Grid principal** (`catalog_items`):
1. Itens com `stock_items.featured = true` primeiro
2. Complemento com os de maior valor até totalizar 5

**Destaques da semana** (`reward_items`, painel lateral):
- Todos com `featured = true` e `active = true`
- Timer calculado dinamicamente: countdown para o menor `expires_at` entre os itens em destaque
- Sem `expires_at` → timer não aparece
- Gerenciados em `/admin/recompensas`

## Diferença entre tipos de itens

| Tipo | Tabela | Exemplos | Gerenciado em |
|---|---|---|---|
| Itens ARC (jogo) | `catalog_items` | Armas, materiais, equipamentos | `/admin/catalogo` + MetaForge sync |
| Itens de recompensa | `reward_items` | Gift cards, merch, sorteios | `/admin/recompensas` |

## Estados Especiais

- **Sem login**: botões de compra levam para `/login`
- **Carregando**: skeleton cards enquanto a API retorna
- **Sem destaques de recompensa**: seção "Destaques da semana" mostra "Nenhum destaque no momento."

## Montador de Loadouts

A aba `/loja?tab=loadouts` usa o mesmo visual da loja, sem banner e sem catálogo lateral. Cada espaço abre um diálogo com busca e somente itens compatíveis. O diálogo usa foco modal nativo e fecha com Escape.

| Espaço | Capacidade | Itens aceitos |
|---|---|---|
| Mochila equipada | 1 | MK3 Sobrevivente (fixa nesta fase de teste) |
| Escudo | 1 | Shield |
| Armas | 2 | Weapon ou isWeapon, excluindo projetos |
| Acessórios | Até 3 por arma | Modification com compatibilidade explícita na descrição; sem repetir família |
| Mochila | 20 | Qualquer item do jogo |
| Uso rápido | 5 | Quick Use, Throwable, Grenade, Consumable, Gadget e Deployable |
| Espaço aperfeiçoado | 1 | Gadget, Deployable ou gadget conhecido do catálogo antigo Quick Use |
| Bolso seguro | 3 | Qualquer item, exceto Weapon, isWeapon e Shield |

- Equipamentos usam os ícones reais do catálogo. Itens equipados podem ser removidos individualmente; a MK3 é mantida no teste.
- Trocar ou remover uma arma limpa seus acessórios. Acessórios sem informação de compatibilidade não são oferecidos. A compatibilidade considera o nome da arma, tradução local e tier; não simula todas as estatísticas do jogo.
- Quantidades são limitadas por `stackSize`; sem informação de pilha, usa 1. Armas, escudos e acessórios ocupam uma unidade.
- A montagem combina estoque da API com metadados locais de `arc-data.js`. Itens sem estoque podem ser usados e são identificados no seletor.
- O rascunho fica neste navegador em `sucatao-loadout-mk3-v1`. Ao restaurar, os dados são validados contra os espaços e o catálogo atuais. Não grava no inventário do jogador.
- Revisar loadout agrega itens repetidos, permite escolher pontos ou reais e usa somente preços configurados. Não inventa conversões nem reserva estoque.
- Enviar ao carrinho exige login, preço configurado e estoque para todos os itens, incluindo as quantidades já no carrinho. Montar ou revisar não realiza compras ou pagamentos.
- Layout em três colunas no desktop, reorganizado em telas menores.

### Validação

`node --test tests/loadout.test.cjs` valida capacidades, restrições, acessórios, pilhas, agregação e disponibilidade. Compilar com `npm run build` (exige as variáveis do projeto, inclusive RESEND_API_KEY).

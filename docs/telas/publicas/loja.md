# Loja do Sucatão

**Rota:** `/loja`  
**Requer autenticação:** Sim (middleware global)

## Descrição

Loja principal do site. Exibe itens do catálogo ARC Raiders à venda e kits gerenciados pelo admin. As abas Contratos à Venda, Leilões, Sorteios e Gift Cards estão temporariamente ocultas na loja. Links antigos com esses valores de `?tab=` abrem a aba Destaques; os cadastros e as áreas administrativas permanecem disponíveis.

## Conteúdo Visível

### Aba Destaques (padrão)
- Banner hero com imagem de fundo e chamada para ação
- **Itens em destaque** — grid de até 5 itens do catálogo (`catalog_items` com `featured = true`)
- Cards de categorias do site

### Categorias da vitrine
- Navegação principal: Destaques, Loadouts, Armas, Consumíveis, Granadas e Materiais.
- Cards de categoria sem fotos por enquanto; as imagens serão fornecidas depois.
- Armas: `isWeapon` ou tipo `Weapon`; projetos são excluídos.
- Todos os itens: exclui armas identificadas por `isWeapon` ou tipo `Weapon`; elas permanecem na aba Armas. A lista, a contagem e os filtros de tipos seguem a mesma exclusão.
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
| Acessórios | 0 a 4, conforme arma e variante | Encaixes específicos: bocal, empunhadura, coronha e carregador do tipo correto |
| Mochila | 20 | Qualquer item do jogo |
| Uso rápido | 5 | Quick Use, Throwable, Grenade, Consumable, Gadget e Deployable |
| Espaço aperfeiçoado | 1 | Gadget, Deployable ou gadget conhecido do catálogo antigo Quick Use |
| Bolso seguro | 3 | Qualquer item, exceto Weapon, isWeapon e Shield |

- Equipamentos usam os ícones reais do catálogo. Itens equipados podem ser removidos individualmente; a MK3 é mantida no teste.
- Trocar ou remover uma arma limpa seus acessórios. Os encaixes dependem da arma e da variante exata; acessórios são filtrados pelo encaixe e pelas listas estruturadas disponíveis. Não simula todas as estatísticas do jogo.
- Quantidades são limitadas por `stackSize`; sem informação de pilha, usa 1. Armas, escudos e acessórios ocupam uma unidade.
- A montagem combina estoque da API com metadados locais de `arc-data.js`. Itens sem estoque podem ser usados e são identificados no seletor.
- O rascunho fica neste navegador em `sucatao-loadout-mk3-v1`. Ao restaurar, os dados são validados contra os espaços e o catálogo atuais. Não grava no inventário do jogador.
- Revisar loadout agrega itens repetidos, permite escolher pontos ou reais e usa somente preços configurados. Não inventa conversões nem reserva estoque.
- Enviar ao carrinho exige login, preço configurado e estoque para todos os itens, incluindo as quantidades já no carrinho. Montar ou revisar não realiza compras ou pagamentos.
- Layout em três colunas no desktop, reorganizado em telas menores.

### Configurador de armas

O configurador separa família da arma e nível (I–V ou Base quando a arma não tem esses tiers). No nível V, o painel à direita permite selecionar melhorias e combinações Amplified que existem no catálogo de variantes. Cada combinação corresponde à arma real que será comprada, com seu preço e estoque; melhorias não viram acessórios cobrados separadamente. Trocar nível/variante preserva somente acessórios ainda compatíveis; trocar família inicia os encaixes vazios. O resumo da compra fica abaixo. Os kits cadastrados pelo admin aparecem na aba Kits prontos; o configurador fica dedicado à personalização da arma.

A gestão é unificada em `/admin/kits`. Os endereços anteriores `/admin/kits-de-armas` e `/admin/kits-prontos` redirecionam para essa tela.

Os registros antigos `weapon_kit` são apresentados como kits livres, mantendo identificador, nome, componentes, destaque e posição. O preço inicial corresponde à soma dos preços cadastrados dos componentes; modalidades incompletas ficam indisponíveis. No primeiro salvamento o registro passa a `ready_kit`, preservando o payload original em `legacyWeaponKit`. A API administrativa antiga retorna 410 após autenticação, evitando novas gravações no formato anterior.

A aba Armas inclui três combinações sugeridas (Águia-Pescadora IV, Renegado IV e Afélio Amplified), editor de uma arma com seus encaixes dinâmicos e resumo à direita. A aba fica focada nos kits: sem catálogo avulso, filtros ou cards adicionais abaixo. Armas individuais continuam acessíveis em Todos os itens. Os acessórios sugeridos priorizam estoque e podem ser trocados ou removidos; trocar arma/tier limpa os acessórios para evitar combinações inválidas. Sem preços ou descontos fictícios: valores são a soma de `pricePoints`/`priceCash` dos componentes. Quantidade de kits multiplica todos os componentes. A compra valida estoque, moeda e quantidades já no carrinho para o conjunto completo, exige login e adiciona os componentes ao carrinho existente. A montagem não reserva estoque. A escolha é mantida enquanto o componente está aberto. Validação adicional: `node --test tests/weapon-kits.test.cjs`.

### Validação

Itens com a nomenclatura `Amplification` (incluindo módulos) recebem o mesmo brilho laranja das armas Amplified, nos cards da loja e no loadout. A identificação considera nome e ID, independentemente do tipo do item.

Empilhamento: a quantidade escolhida completa pilhas do mesmo item e usa espaços vazios somente na seção selecionada (mochila, uso rápido ou bolso seguro). Exemplo: 12 ataduras com limite 5 ocupam três espaços, 5 + 5 + 2. Editar um espaço preenchido substitui sua pilha; outras pilhas e seções não são removidas. Se toda a quantidade não couber, a operação é recusada por inteiro e informa a capacidade disponível, preservando a montagem. Equipamentos e acessórios continuam com uma unidade por encaixe.

Em telas a partir de 1600px, a montagem fica alinhada à esquerda e Valores do loadout ocupa uma coluna à direita, com rolagem própria para listas longas. Em telas menores o resumo fica abaixo, sem aumentar os slots.

O montador exibe preços unitários em pontos e reais no seletor. A seção Valores do loadout lista cada item equipado (incluindo acessórios), quantidade e valor já multiplicado, sem repetir preço unitário ou rótulo de subtotal por item, além dos totais nas duas moedas, atualizados ao montar. Usa somente `pricePoints` e `priceCash` cadastrados; não converte o valor de venda do jogo em preço da loja. Preço ausente, inválido ou não positivo aparece como indisponível e é excluído da soma; nesse caso a respectiva moeda mostra subtotal e quantidade de unidades sem preço. Estoque e validação de compra continuam independentes da exibição do preço.

Os espaços preenchidos e o seletor do loadout usam o brilho difuso de raridade da loja. Armas Amplified (inclusive nomes legados de tier V) usam laranja (`#ff8a32`) no loadout e nos cards da loja, sem alterar sua raridade cadastrada. Espaços vazios continuam neutros.

`node --test tests/loadout.test.cjs` valida capacidades, restrições, acessórios, pilhas, agregação e disponibilidade. Compilar com `npm run build` (exige as variáveis do projeto, inclusive RESEND_API_KEY).

### Dados de acessórios e variantes

- Regra de compatibilidade: todo acessório da categoria cabe no encaixe correspondente, independentemente do tier da arma ou do acessório. Listas `compatibleWeapons` incompletas do MetaForge são apenas referência e não filtram a seleção. Isso inclui todas as coronhas da Águia-Pescadora IV, o Conversor Cinético e a Empunhadura Horizontal.

- A cópia local em `src/data/weapon-attachments.json` foi conferida em 18/10/2026: 181 armas/variantes e 38 acessórios do [MetaForge](https://metaforge.app/arc-raiders), inclusive variantes Amplified (tier V).
- A API pública `GET /api/arc-raiders/items` fornece `stat_block.compatibleWeapons` em parte dos acessórios. `loadout_slots` indica em qual região do inventário o item pode ser colocado; não informa a quantidade de acessórios da arma. `attachedSlots`, observado em móveis, também não é usado como capacidade de arma.
- Como a API não fornece essa matriz, os tipos de encaixe são complementados pelas tabelas [Weapons](https://arcraiders.wiki/wiki/Weapons), [Canto](https://arcraiders.wiki/wiki/Canto) e [Weapon Mods](https://arcraiders.wiki/wiki/Weapon_Mods) da ARC Raiders Wiki. A página individual de Canto confirma carregador médio, corrigindo uma inconsistência da tabela geral.
- As restrições de [Amplified Weapons](https://arcraiders.wiki/wiki/Amplified_Weapons) são aplicadas por variante: Renegade Scoped remove carregador; Kettle X-Rounds remove carregador; Canto Carbine Conversion/Sprint Shooting e Osprey Ergonomic Bolt removem coronha. Outras variantes mantêm os encaixes base confirmados. Um nome genérico terminado em V representa apenas a variante amplificada base, sem presumir uma melhoria específica.
- Mantém-se a distinção entre carregadores leves, médios e de escopeta, e entre bocais comuns e de escopeta. Variantes sem determinado encaixe não podem receber acessórios dele. Dados novos ou armas sem regra confirmada não recebem três espaços genéricos: a interface informa que os encaixes não estão confirmados.
- A validação percorre as 181 armas/variantes da cópia local e as armas traduzidas, cruzando todos os 38 acessórios com os encaixes disponíveis. Também verifica que os 38 acessórios estão presentes no catálogo do loadout. Anvil Splitter legado permanece fora da seleção de acessórios: nas variantes atuais ele é uma melhoria Amplified, sem categoria de encaixe própria.
- Cada encaixe tem ID estável por tipo. Rascunhos antigos com três espaços numerados são migrados para os encaixes válidos; acessórios incompatíveis ou de encaixes removidos são descartados antes da revisão/carrinho.
- Atualização manual: `node scripts/sync-weapon-attachments.mjs`. Busca o catálogo paginado uma vez e atualiza a cópia local somente ao concluir. Mantém a matriz curada e as restrições confirmadas; novas famílias continuam sem encaixes até conferência. O navegador não consulta o MetaForge diretamente.
- Atribuição visível no montador: MetaForge e ARC Raiders Wiki. As referências da wiki indicam [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/); os dados de regras foram adaptados para este montador.
# Kits prontos

A aba **Kits prontos** vende pacotes com composição e preço próprios. Em **Admin → Kits**, cadastre nome, descrição, imagem (opcional, usa o primeiro item se vazia), itens e quantidades por pacote, pontos e reais. Zero desabilita a modalidade. Kits começam inativos; ative depois de revisar. Destaques aparecem primeiro, seguidos pela ordem cadastrada. A montagem é livre: cada item adicionado começa com uma unidade, e o admin escolhe sua quantidade. Não há geração de modelos fixos de 20 unidades. Kits já cadastrados são preservados e podem ser editados. A busca facilita localizar os pacotes.

O carrinho contabiliza pacotes: duas unidades de um kit com 20 armas entregam 40 armas. O checkout consulta novamente o cadastro, recusa kits inativos ou conteúdo/preços alterados, converte o pacote em seus componentes reais e baixa o estoque agregado, inclusive com itens avulsos no carrinho. Pontos e centavos são distribuídos sem alterar o total do pacote. Pedidos e inventário registram os componentes para entrega. Alterações no admin não reservam estoque.

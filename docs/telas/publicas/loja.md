# Loja do Sucatão

**Rota:** /loja · **Revisado em:** 19/10/2026

A vitrine pode ser consultada sem login; comprar exige autenticação. O visual usa a identidade escura do site, slots compactos, brilho de raridade e brilho laranja para itens Amplified e Amplification, sem mudar a raridade cadastrada.

## Navegação

Abas disponíveis: Destaques, Kits prontos, Loadouts, Armas, Consumíveis, Granadas, Materiais e Todos os itens. Os links usam respectivamente ?tab=destaques, kits, loadouts, armas, consumiveis, granadas, materiais e itens.

Contratos à Venda, Leilões, Sorteios e Gift Cards estão temporariamente ocultos para clientes. Seus cadastros e implementações foram preservados; URLs antigas dessas abas abrem Destaques. A página independente /contratos permanece disponível.

Destaques mostra itens destacados do estoque, com complemento pelos de maior valor até cinco itens. O painel lateral mantém recompensas ativas em destaque e o contador do vencimento mais próximo, quando informado. Imagens próprias das categorias seguem pendentes de fornecimento.

Consumíveis, Granadas, Materiais e Todos os itens mantêm busca, raridade, tipo, favoritos, ordenação e modal de compra. Projetos não entram nas categorias específicas. Todos os itens exclui armas por isWeapon ou tipo Weapon, inclusive da contagem e das opções de filtro. Armas usa o configurador, sem catálogo de armas avulsas abaixo.

## Montador de loadouts

O cliente clica nos espaços para escolher itens compatíveis, sem catálogo lateral de equipamentos.

| Espaço | Capacidade | Regra |
|---|---|---|
| Mochila equipada | 1 | MK3 Sobrevivente fixa nesta fase de teste |
| Escudo | 1 | Shield |
| Armas | 2 | Armas, excluindo projetos |
| Acessórios | Conforme arma e variante | Categoria do encaixe disponível |
| Mochila | 20 | Qualquer item do jogo |
| Uso rápido | 5 | Granadas, consumíveis e gadgets; tipos equivalentes do catálogo |
| Espaço aperfeiçoado | 1 | Gadgets e equivalentes Deployable/Quick Use conhecidos |
| Bolso seguro | 3 | Qualquer item, exceto armas e escudos |

A montagem completa pilhas existentes e ocupa espaços vazios somente na seção selecionada. Exemplo: 12 itens com limite 5 ocupam 5 + 5 + 2. Se a quantidade inteira não couber, nada é alterado. Editar uma pilha substitui aquele espaço. Equipamentos e acessórios usam uma unidade por encaixe; sem limite conhecido, o montador usa uma unidade.

O rascunho é salvo neste navegador em sucatao-loadout-mk3-v1, validado ao restaurar e não altera o inventário do jogador. Rascunhos antigos com três acessórios numerados são migrados para encaixes válidos; acessórios incompatíveis são descartados. Itens sem estoque podem ser usados para planejar, com identificação no seletor.

Valores do loadout soma itens repetidos, incluindo acessórios, e exibe quantidade, valor multiplicado e totais em pontos/reais, sem repetir preço unitário e subtotal em cada linha. Preços ausentes ou não positivos ficam indisponíveis; a moeda incompleta informa subtotal e unidades sem preço. Não converte valor do jogo em preço comercial. Em telas a partir de 1600px a montagem fica à esquerda e os valores à direita, com rolagem própria; em telas menores os valores ficam abaixo.

Revisar e montar não reservam estoque. Enviar ao carrinho exige login e preço/estoque para a composição. A confirmação da compra é validada pelo servidor.

## Configurador de armas

Escolha a família e o nível I–V, ou Base para armas sem esses níveis. Tier V seleciona variantes Amplified reais do catálogo. O painel de melhorias permite somente combinações existentes; não cria variantes nem preços por melhoria. O resumo fica abaixo do configurador. A quantidade de kits multiplica arma, acessórios e estampa.

Trocar nível ou variante da mesma família preserva somente acessórios compatíveis; trocar família limpa acessórios. Cada categoria de acessório cabe no encaixe correspondente, independentemente do tier. Listas incompletas de compatibleWeapons do MetaForge não restringem a seleção. Isso inclui Conversor Cinético como coronha, Empunhadura Horizontal e todas as coronhas disponíveis para Águia-Pescadora IV.

Os encaixes são dinâmicos: bocal, empunhadura, coronha e carregador do tipo correto. Não há três encaixes genéricos para armas desconhecidas. Distinguem-se carregadores leves, médios e de escopeta e bocais comuns/de escopeta. Algumas melhorias removem encaixes: Renegade Scoped e Kettle X-Rounds removem carregador; Canto Carbine Conversion/Sprint Shooting e Osprey Ergonomic Bolt removem coronha. Anvil Splitter é melhoria Amplified, não acessório separado.

### Estampas

A seção Estampa mostra somente opções compatíveis com a família escolhida. A API fornece identidade e imagem dos itens; a compatibilidade vem da tabela editorial do MetaForge, revisada e registrada em src/data/weapon-stencils.json. Amplified e famílias sem confirmação não recebem estampas. Trocar arma/nível mantém a escolha somente quando compatível.

A interface usa a imagem da estampa, sem simular a textura aplicada à arma. Seu preço cadastrado é somado ao da arma por unidade. As duas consomem estoque. O carrinho distingue combinações com estampas diferentes; o pedido identifica a estampa no nome e nos campos stencilId/stencilName da arma, para orientar a entrega. Não existe aplicação automática dentro do jogo.

## Kits prontos

A aba vende pacotes livres cadastrados em [Admin → Kits](../admin/kits.md). Podem misturar qualquer item ativo e quantidades escolhidas pelo admin. Não são limitados a armas nem a 20 unidades. Cada pacote tem composição, preço, imagem, posição, ativação e destaque próprios.

O carrinho conta pacotes: duas unidades de um kit com 20 itens representam 40 unidades físicas. O checkout relê o kit, recusa cadastros inativos ou conteúdo/preço alterado e transforma o pacote em componentes reais. Pontos e centavos são distribuídos entre componentes preservando o total do pacote.

## Todos os itens: venda por stack

Itens empilháveis são vendidos por pilha completa; limite 1 significa venda por unidade. A referência é stat_block.stackSize do MetaForge, registrada em src/data/item-stack-sizes.json. A confirmação por ID ou nome original prevalece sobre limites antigos do banco; depois usa-se stack_size válido do catálogo. Furniture sem informação de pilha mantém venda unitária; outros itens sem limite conhecido ficam indisponíveis.

O preço é o preço unitário existente multiplicado pelo tamanho da pilha. Cards e modal informam a quantidade e o preço do pacote. Estoque abaixo de uma pilha completa não permite comprar uma pilha parcial. O carrinho conta stacks e o servidor converte para unidades reais no pedido e no inventário. Mudanças de preço ou limite exigem adicionar novamente ao carrinho.

Essa regra é específica de Todos os itens. Outras categorias, loadouts e kits livres mantêm seus próprios fluxos. O cálculo preserva o fallback comercial já existente do catálogo quando não há preço configurado; não altera automaticamente os preços cadastrados.

## Dados e manutenção

| Fonte | Uso |
|---|---|
| GET /api/catalog | Catálogo ativo e estoque/preços |
| GET /api/store/ready-kits | Pacotes ativos |
| GET /api/loja/weekly | Recompensas ativas em destaque |
| profiles | Carteira e perfil autenticado |
| src/data/arc-data.js | Metadados e traduções locais |
| src/data/weapon-attachments.json | Variantes, acessórios e matriz de encaixes |
| src/data/weapon-stencils.json | Famílias compatíveis com estampas |
| src/data/item-stack-sizes.json | Limites de pilha confirmados |

O catálogo MetaForge não informa a matriz completa de encaixes: loadout_slots descreve regiões do inventário, não quantidade de acessórios. A matriz foi complementada pelas páginas Weapons, Canto, Weapon Mods e Amplified Weapons da ARC Raiders Wiki. A cópia de acessórios foi conferida em 18/10/2026; estampas e stacks em 19/10/2026. Datas e fontes ficam nos arquivos. Novas famílias precisam de conferência, sem encaixes ou estampas presumidos.

Para atualizar acessórios: node scripts/sync-weapon-attachments.mjs. O script preserva a matriz curada e só grava após concluir a consulta paginada. Stacks e estampas exigem atualizar e revisar suas cópias locais; sincronizar o catálogo não substitui essas revisões. O navegador não consulta MetaForge diretamente para essas regras.

Referências: [MetaForge](https://metaforge.app/arc-raiders), [compatibilidade de estampas](https://metaforge.app/arc-raiders/weapon-stencils-in-arc-raiders-everything-you-need-to-know), [Weapons](https://arcraiders.wiki/wiki/Weapons), [Canto](https://arcraiders.wiki/wiki/Canto), [Weapon Mods](https://arcraiders.wiki/wiki/Weapon_Mods) e [Amplified Weapons](https://arcraiders.wiki/wiki/Amplified_Weapons). Regras da wiki adaptadas sob [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/).

Veja também: [Preços](../../admin-precos.md), [Catálogo e traduções](../admin/catalogo.md), [API e checkout](../../apis/loja.md) e [resumo das atualizações](../../atualizacoes-2026-10-19.md).

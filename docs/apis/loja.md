# APIs da loja e representação das compras

**Revisado em:** 19/10/2026. A loja pode ser consultada sem login; o checkout exige usuário autenticado e as rotas administrativas exigem administrador.

| Endpoint | Uso |
|---|---|
| GET /api/catalog | Catálogo público com estoque/preços e nome original para identificação |
| GET /api/store/ready-kits | Kits ativos para a vitrine |
| GET/POST /api/admin/ready-kits | Administração dos kits livres |
| GET /api/admin/catalog/types | Categorias existentes, incluindo ativos e inativos |
| GET /api/admin/catalog | Busca e filtros do catálogo administrativo |
| PATCH /api/admin/catalog/:id | Ativação ou edição protegida do nome |
| POST /api/admin/catalog/sync | Sincronização com MetaForge preservando nomes manuais |
| PATCH /api/admin/prices | Edição de preços com resultados por linha e proteção contra concorrência |
| POST /api/store/checkout | Validação e criação do pedido |

## Linhas compostas no carrinho

| Identificador | Quantidade no carrinho | Expansão no servidor |
|---|---|---|
| ID real do catálogo | Unidades | Item real |
| kit:<id> | Pacotes | Composição atual do kit × quantidade |
| painted:<arma codificada>:<estampa codificada> | Armas com a estampa escolhida | Uma arma e uma estampa por unidade |
| stack:<item codificado>:<limite> | Pilhas completas | Quantidade × limite em unidades reais |

IDs sintéticos são apenas representação de venda; não são novos itens de catálogo ou inventário. As linhas de kit também enviam kitContents, a composição ordenada usada para detectar alterações. Não confie no conteúdo enviado pelo navegador como definição atual.

Kits: o servidor relê a entidade e exige kit ativo, conteúdo e preço correspondentes. Distribui pontos inteiros e centavos entre componentes preservando o total; uma distribuição pode produzir linhas separadas do mesmo item com valores unitários diferentes.

Armas com estampa: o servidor consulta itens ativos, preços atuais e compatibilidade da cópia local, rejeitando famílias desconhecidas e Amplified. Soma os preços e inclui stencilId/stencilName e identificação legível no pedido. Acessórios continuam como componentes reais separados.

Stacks: o servidor confere limite, preço e quantidade inteira, rejeita armas nesse formato e calcula unidades físicas. Valores ou limites alterados invalidam a oferta anterior. A quantidade de stacks e de kits é limitada a 1–2.000 por linha; o limite comercial não redefine o tamanho de pilha do jogo.

Após a expansão, o estoque é conferido por ID real agregado, inclusive quando o mesmo item aparece em kits, estampas, stacks e linhas avulsas. A montagem não reserva estoque. As prévias no navegador não substituem essa validação: nem todos os controles locais expandem todos os formatos de linha.

## Preços e inventário

Kits têm preço próprio definido pelo admin. Configurações de armas somam componentes. Stacks multiplicam o preço unitário existente pelo limite e preservam o fallback já utilizado pelo catálogo. Não aplicar a regra de fallback do catálogo ao resumo do loadout, que usa somente preços configurados.

Pedidos e inventário recebem IDs reais e quantidades físicas. Para PIX, a entrada no inventário segue a confirmação de pagamento; para pontos, segue o checkout concluído. A entrega com estampa é orientada pelos dados do pedido, sem aplicação automática no jogo.

## Código e verificações

- src/lib/ready-kits.ts: validação, compatibilidade legada e expansão de pacotes.
- src/lib/weapon-stencils.ts e painted-weapon-store.ts: estampa, preço e leitura atual do catálogo/estoque.
- src/lib/stack-sales.ts: tamanho, oferta e expansão de stacks.
- src/lib/catalog-translations.ts e catalog-translation-store.ts: revisões manuais de nomes.
- tests/ready-kits.test.cjs, weapon-kits.test.cjs, stack-sales.test.cjs, loadout.test.cjs, catalog-translations.test.cjs e price-editor.test.cjs: regras de negócio.

Veja [Loja](../telas/publicas/loja.md), [Kits](../telas/admin/kits.md) e [Preços](../admin-precos.md).


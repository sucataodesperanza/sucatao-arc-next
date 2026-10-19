# Atualizações consolidadas — 19/10/2026

Este registro resume o estado implementado da loja e do admin após as revisões de outubro. As regras completas estão nos documentos vinculados.

- **Vitrine:** categorias próprias, aba Kits prontos, armas removidas de Todos os itens e abas Contratos à Venda, Leilões, Sorteios e Gift Cards ocultas temporariamente.
- **Loadouts:** MK3 Sobrevivente, espaços conforme o inventário do jogo, caixas compactas, seleção por encaixe, pilhas por seção, rascunho local e resumo financeiro à direita em telas grandes. Quantidades e valores são agregados sem informação repetida.
- **Armas:** seleção por família/nível, variantes Amplified reais, encaixes dinâmicos e acessórios de qualquer tier da categoria compatível. Inclusão de Conversor Cinético, Empunhadura Horizontal e revisão das coronhas da Águia-Pescadora IV.
- **Visual:** sombras de raridade nos itens e brilho laranja para Amplified/Amplification.
- **Estampas:** seleção por família confirmada, acréscimo do preço da estampa e estoque separado; identificação no pedido. Amplified sem compatibilidade confirmada permanece bloqueada.
- **Kits livres:** administração unificada em /admin/kits, qualquer combinação de itens/quantidades, preços próprios, imagem, ativação, destaque e posição. Cadastros antigos preservados e rotas antigas redirecionadas; exemplos de 20 unidades não são restrição.
- **Preços:** edição direta, filtros, rascunhos, alterações em lote, sugestões opcionais e proteção contra sobrescrita concorrente, sem sair do site.
- **Catálogo:** traduções editáveis no site, original em inglês preservado, busca nos dois idiomas e revisões protegidas no sync. Filtros de Pesquisa, Design e Estampas disponíveis.
- **Venda por pilha:** Todos os itens vende stack completo para empilháveis e unidade para limite 1. Referência MetaForge, estoque/preço por pacote e conversão para unidades reais no checkout.
- **Checkout:** valida composição/preço das ofertas compostas e estoque agregado; pedidos e inventário usam componentes reais.

## Onde administrar

| Preciso alterar | Tela |
|---|---|
| Nome/tradução ou disponibilidade do catálogo | [Catálogo](telas/admin/catalogo.md) |
| Preço unitário | [Preços](admin-precos.md) |
| Quantidade disponível | [Estoque](telas/admin/estoque.md) |
| Composição, preço e destaque de pacote | [Kits](telas/admin/kits.md) |
| Conferir entrega e estampa escolhida | [Pedidos](telas/admin/pedidos.md) |

[Comportamento da loja](telas/publicas/loja.md) · [API e manutenção](apis/loja.md) · [Índice](README.md)


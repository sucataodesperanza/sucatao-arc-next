# Edição rápida de preços

A lista mostra somente itens ativos no Catálogo que já possuem registro em estoque, inclusive com quantidade zero. O carregamento usa `GET /api/admin/prices`, consultando diretamente `catalog_items` com `active = true` antes da paginação e da contagem. Busca, filtros, seleção de todos os resultados e edição em lote operam sobre essa lista. Ao voltar à aba do navegador, a lista é atualizada automaticamente se não houver edições pendentes. Também é possível usar Atualizar lista (salve ou descarte rascunhos antes). Desativar não apaga preços nem estoque; a tela Estoque mantém sua consulta completa.

Em `/admin/precos`, o administrador pode buscar sem acentos, filtrar categoria/tier/situação, editar pontos e reais diretamente na tabela e usar Tab para avançar. As células pendentes ficam destacadas. Alterações permanecem ao filtrar ou paginar. Salvar alterações grava somente os campos modificados; Descartar alterações e Desfazer (por linha) revertem apenas os rascunhos locais.

Selecionar esta página marca 50 linhas; Selecionar todos os resultados marca todo o filtro. A barra de lote informa a seleção completa, inclusive itens em outras páginas. Definir preço nos selecionados modifica apenas as moedas marcadas e prepara rascunhos para revisão. Os valores em reais aceitam vírgula (1,50) e os pontos exigem inteiros positivos. Não há criação de estoque nesta tela.

Opções avançadas permite preparar sugestões VEI nas moedas escolhidas. Calcula no servidor com os multiplicadores salvos e o mesmo fallback de `calcVei`, preserva edições já digitadas e não grava preços. Não recalcula automaticamente todos os itens.

`PATCH /api/admin/prices` exige administrador, valida até 100 itens por requisição, limites numéricos, moedas e preços originais. Cada linha atualiza suas moedas de forma condicional aos valores originais, evitando sobrescrever uma edição concorrente. Os campos de estoque não são aceitos. Retorna sucesso/erro por linha; gravações confirmadas são removidas do rascunho, falhas permanecem para revisão. Lotes grandes são divididos em grupos de 100 e processados com concorrência limitada. A operação inteira não é uma transação: os resultados parciais são apresentados explicitamente.

O carregamento usa páginas de 500 registros para respeitar limites do banco e não saltar itens. Falhas não exibem uma lista parcial como completa. Salvar não recarrega a tabela nem perde página/filtros. Atualizar lista fica bloqueado enquanto há edições pendentes. Fechar/recarregar a página com rascunhos gera o aviso padrão do navegador.

Verificação: `node --test tests/price-editor.test.cjs` e `npm run build`. Não alterar preços reais como teste de interface.

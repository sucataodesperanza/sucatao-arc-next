# Admin — Kits

**Rota:** /admin/kits · **Acesso:** administrador · **Revisado em:** 19/10/2026

Esta é a gestão única de kits prontos. /admin/kits-de-armas e /admin/kits-prontos redirecionam para cá. O configurador de armas na loja permanece separado para o cliente personalizar sua compra.

## Cadastrar e manter

1. Clique em Novo kit e informe nome, descrição e imagem opcional. Sem imagem própria, usa a do primeiro item.
2. Busque qualquer item ativo do catálogo e adicione os componentes. Cada item começa com uma unidade; escolha livremente a quantidade.
3. Defina o preço total do pacote em pontos e/ou reais. Zero desabilita aquela modalidade. Não há preço comercial inventado nem modelo obrigatório de 20 unidades.
4. Revise a composição e os preços, marque destaque e posição se desejar, e ative para publicar. Kits novos começam inativos.

São permitidos de 1 a 30 componentes diferentes, com quantidade inteira entre 1 e 2.000 por componente. Itens repetidos devem ser reunidos na mesma quantidade. Um kit pode misturar armas, acessórios, curas, materiais e outros itens; não exige uma arma nem valida encaixes de acessórios, pois é um pacote livre.

A imagem aceita caminho local do site ou URL HTTPS. A ordem pública prioriza destaques e depois posição/nome. Use a busca para localizar pacotes. Desativar preserva o cadastro e impede novas compras. Salvar ou ativar não reserva estoque.

## Preço, estoque e entrega

O preço configurado é o total de um pacote, independente da soma dos preços unitários dos componentes. É possível salvar rascunho inativo sem preço; ativar exige pelo menos uma modalidade positiva. A compra depende do estoque de todos os componentes multiplicado pela quantidade de pacotes.

O servidor relê cadastro, preços e composição ao finalizar. Mudanças exigem adicionar o kit novamente ao carrinho. Pedidos e inventário recebem os componentes reais, com valores distribuídos de forma que a soma seja exatamente o preço do pacote. Veja [API da loja](../../apis/loja.md).

## Compatibilidade com cadastros antigos

Registros weapon_kit são apresentados como kits livres, preservando ID, nome, componentes, destaque e posição. O preço inicial é a soma dos preços cadastrados dos componentes; modalidades incompletas ficam indisponíveis. O primeiro salvamento converte a entidade para ready_kit e mantém o payload anterior em legacyWeaponKit.

O endpoint administrativo antigo retorna 410 após verificar autenticação; novas gravações usam a API de kits livres. O gerador de modelos fixos de 20 unidades foi removido; cadastros existentes foram preservados.

## Fontes

- app_entities: entidades ready_kit e leitura compatível de weapon_kit.
- catalog_items: seleção de itens ativos; stock_items: disponibilidade.
- GET/POST /api/admin/ready-kits: consulta e gravação com permissão de admin.
- GET /api/store/ready-kits: vitrine pública de kits ativos.

Para preços unitários, use [Preços](../../admin-precos.md). Para nomes em português, use [Catálogo](catalogo.md).


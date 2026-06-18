-- Popula a tabela maps com os dados do arc-data.js.
-- ON CONFLICT DO NOTHING para ser idempotente (pode rodar várias vezes sem duplicar).

insert into public.maps (id, name, label, description, image, status, sort_order, active) values
(
  'dam_battlegrounds',
  'Campos de Batalha da Represa',
  'Zona industrial',
  'Regiao de represa com estruturas abertas, corredores tecnicos e bons pontos para planejar rotas de farm e confronto.',
  '/assets/maps/dam_battlegrounds.png',
  'ready', 1, true
),
(
  'the_spaceport',
  'Espaçoporto',
  'Infraestrutura espacial',
  'Setores urbanos e areas tecnicas conectadas por acessos largos, ideal para marcar rotas de entrada, extracao e loot.',
  '/assets/maps/the_spaceport.png',
  'ready', 2, true
),
(
  'buried_city',
  'Cidade Soterrada',
  'Distrito urbano',
  'Cidade soterrada com quadras densas e caminhos internos, boa para separar setores de busca e pontos de risco.',
  '/assets/maps/buried_city.png',
  'ready', 3, true
),
(
  'the_blue_gate',
  'O Portão Azul',
  'Zona de acesso',
  'Mapa amplo com fortificacoes e pontos de passagem, pronto para receber marcadores de chaves, cofres e rotas seguras.',
  '/assets/maps/the_blue_gate.png',
  'ready', 4, true
),
(
  'stella_montis_upper',
  'Stella Montis Superior',
  'Stella Montis superior',
  'Camada superior de Stella Montis, separada para facilitar leitura de elevacao e rotas entre setores.',
  '/assets/maps/stella_montis_upper.png',
  'ready', 5, true
),
(
  'stella_montis_lower',
  'Stella Montis Inferior',
  'Stella Montis inferior',
  'Camada inferior de Stella Montis, preparada para pontos subterraneos, caminhos fechados e comparacao com a camada superior.',
  '/assets/maps/stella_montis_lower.png',
  'ready', 6, true
),
(
  'riven_tides',
  'Marés Partidas',
  'Em construção',
  'Mapa presente no dataset mas ainda sem imagem disponível.',
  null,
  'pending', 7, true
)
on conflict (id) do nothing;

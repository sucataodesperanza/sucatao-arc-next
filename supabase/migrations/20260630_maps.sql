-- Sistema de mapas dinâmico — aditivo, sem DROP.

create table if not exists public.maps (
  id          text primary key,                     -- ex: "dam_battlegrounds"
  name        text not null,
  label       text not null default '',             -- ex: "Zona industrial"
  description text not null default '',
  image_url   text null,                            -- ex: "/assets/maps/dam_battlegrounds.png"
  status      text not null default 'pending',      -- "ready" | "pending"
  index       integer not null default 0,           -- ordem de exibição
  metaforge_id text null,                           -- id externo para sync futuro
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.map_markers (
  id       uuid primary key default gen_random_uuid(),
  map_id   text not null references public.maps(id) on delete cascade,
  type     text not null,                           -- "loot" | "extract" | "key" | "danger" | "route"
  x        numeric(5,2) not null,                  -- posição % horizontal
  y        numeric(5,2) not null,                  -- posição % vertical
  title    text not null,
  note     text not null default '',
  active   boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.maps        enable row level security;
alter table public.map_markers enable row level security;

create policy "maps_select_all"        on public.maps        for select using (true);
create policy "map_markers_select_all" on public.map_markers for select using (active = true);

create index if not exists idx_map_markers_map on public.map_markers(map_id);

-- Seed: mapas do arc-data.js
insert into public.maps (id, name, label, description, image_url, status, index) values
  ('dam_battlegrounds',  'Campos de Batalha da Represa', 'Zona industrial',          'Região de represa com estruturas abertas, corredores técnicos e bons pontos para planejar rotas de farm e confronto.',            '/assets/maps/dam_battlegrounds.png',  'ready',   1),
  ('the_spaceport',      'Espaçoporto',                  'Infraestrutura espacial',   'Setores urbanos e áreas técnicas conectadas por acessos largos, ideal para marcar rotas de entrada, extração e posicionamento.',  '/assets/maps/the_spaceport.png',      'ready',   2),
  ('buried_city',        'Cidade Soterrada',             'Zona urbana subterânea',    'Labirinto de ruas e edifícios soterrados com múltiplos níveis. Ideal para rotas cobertas e farm em alta densidade.',               '/assets/maps/buried_city.png',        'ready',   3),
  ('the_blue_gate',      'O Portão Azul',                'Instalação de fronteira',   'Área de controle com forte presença estrutural. Bom para análise de fluxo de combate e pontos defensivos.',                       '/assets/maps/the_blue_gate.png',      'ready',   4),
  ('stella_montis_upper','Stella Montis Superior',       'Zona montanhosa alta',      'Camada superior do bioma montanhoso. Alta exposição e linhas de visão longas.',                                                     '/assets/maps/stella_montis_upper.png','ready',   5),
  ('stella_montis_lower','Stella Montis Inferior',       'Zona montanhosa baixa',     'Nível inferior do complexo, com passagens subterrâneas e menor exposição.',                                                         '/assets/maps/stella_montis_lower.png','ready',   6),
  ('riven_tides',        'Marés Partidas',               'Zona costeira',             'Mapa costeiro em fase de adição. Dados e imagem em breve.',                                                                         null,                                  'pending', 7)
on conflict (id) do nothing;

-- Seed: marcadores do map-markers.js
insert into public.map_markers (map_id, type, x, y, title, note) values
  ('dam_battlegrounds',  'loot',    52, 54, 'Hydroponic Dome',     'Area boa para materiais e itens de valor medio.'),
  ('dam_battlegrounds',  'danger',  70, 49, 'Power Generation',    'Setor aberto com muita linha de visao.'),
  ('dam_battlegrounds',  'extract', 38, 72, 'Rota sul',            'Saida sugerida quando o centro estiver contestado.'),
  ('dam_battlegrounds',  'key',     62, 67, 'Control Tower',       'Marcar aqui futuras portas, cofres ou chaves confirmadas.'),
  ('the_spaceport',      'loot',    48, 42, 'Terminal interno',    'Boa area candidata para itens tecnologicos.'),
  ('the_spaceport',      'extract', 74, 66, 'Acesso leste',        'Rota lateral para sair evitando o eixo central.'),
  ('the_spaceport',      'danger',  58, 55, 'Pista aberta',        'Cruzar com cautela; pouco abrigo visual.'),
  ('buried_city',        'loot',    44, 48, 'Quadras centrais',    'Separar por setores para busca rapida.'),
  ('buried_city',        'route',   29, 61, 'Caminho oeste',       'Rota demonstrativa para farm em baixa exposicao.'),
  ('buried_city',        'danger',  63, 43, 'Cruzamento aberto',   'Ponto provavel de contato entre squads.'),
  ('the_blue_gate',      'key',     51, 36, 'Ancient Fort',        'Bom candidato para codigos e portas especiais.'),
  ('the_blue_gate',      'loot',    63, 58, 'Setor fortificado',   'Marcar caixas raras quando confirmadas.'),
  ('the_blue_gate',      'extract', 35, 72, 'Retirada baixa',      'Saida demonstrativa para rota segura.'),
  ('stella_montis_upper','route',   49, 50, 'Ligacao superior',    'Ponto para conectar trajetos entre camadas.'),
  ('stella_montis_upper','danger',  66, 44, 'Passarela exposta',   'Marcador teste para risco de elevacao.'),
  ('stella_montis_lower','loot',    42, 57, 'Setor inferior',      'Area candidata para materiais subterraneos.'),
  ('stella_montis_lower','extract', 61, 70, 'Saida tecnica',       'Rota demonstrativa de baixa visibilidade.')
on conflict do nothing;

-- Seed dos contratos iniciais.
-- Execute APÓS 20260627_contracts.sql.

insert into public.contracts (
  type, tier, title, description, story, image_url,
  objective, total, sucatas, xp, rep,
  location, estimated_time, best_time_of_day, climate, environmental_risk,
  expires_at, variant,
  bonus_condition, bonus_reward,
  rewards, objectives, enemies,
  success_rate, players_completed, best_record_time, best_record_player,
  active
) values

-- 1. Ameaça Mecânica
(
  'Principal', 'Épico',
  'Ameaça Mecânica',
  'Elimine 5 unidades ARC Sentinel na região de Speranza para reduzir a presença hostil.',
  'Relatórios indicam alta concentração de ARC Sentinel patrulhando as ruínas da Cidade Alta. Neutralize as unidades antes que estabeleçam base permanente.',
  '/assets/bots/arc_bastion.png',
  'Elimine 5 ARC Sentinel', 5, 250, 500, 80,
  'Cidade Alta', '20 - 35 min', 'Noite', 'Nublado', 'Alto',
  now() + interval '2 days 14 hours', null,
  'Elimine todos sem morrer', '+80 REP extra',
  '[
    {"kind":"currency","amount":250},
    {"kind":"xp","amount":500},
    {"kind":"item","item_name":"Componentes Mecânicos Avançados","item_image":"/assets/items/advanced_mechanical_components.png","item_qty":3}
  ]'::jsonb,
  '[
    {"text":"Infiltre-se na área","desc":"Entre na zona de patrulha sem acionar alarmes.","total":1},
    {"text":"Elimine 5 ARC Sentinel","desc":"Neutralize todas as unidades patrulheiras.","total":5},
    {"text":"Extraia com segurança","desc":"Saia da área antes do reforço chegar.","total":1}
  ]'::jsonb,
  '[
    {"name":"ARC Sentinel","type":"Máquina Pesada","dots":4,"color":"#F5090D","image":"/assets/bots/arc_sentinel.png"},
    {"name":"ARC Bastion","type":"Máquina Pesada","dots":4,"color":"#F5090D","image":"/assets/bots/arc_bastion.png"},
    {"name":"ARC Scout","type":"Máquina Leve","dots":2,"color":"#b477ff","image":"/assets/bots/arc_snitch.png"}
  ]'::jsonb,
  61, 847, '14m 12s', 'Hayashii', true
),

-- 2. Coleta de Recursos
(
  'Secundário', 'Avançado',
  'Coleta de Recursos',
  'Colete 20 unidades de Peças de Metal espalhadas pelo mapa para reforçar o suprimento da base.',
  'Grandes depósitos de metal foram identificados na Estação de Trem. Colete o máximo de materiais antes que outras equipes ou patrulhas ARC cheguem.',
  '/assets/bots/arc_spotter.png',
  'Colete 20 Peças de Metal', 20, 120, 200, null,
  'Estação de Trem', '15 - 25 min', 'Manhã', 'Claro', 'Baixo',
  now() + interval '1 day 6 hours', null,
  'Colete tudo sem ser visto', '+20% Sucatas',
  '[
    {"kind":"currency","amount":120},
    {"kind":"xp","amount":200},
    {"kind":"item","item_name":"Módulos Exodus","item_image":"/assets/items/exodus_modules.png","item_qty":2}
  ]'::jsonb,
  '[
    {"text":"Localize os depósitos","desc":"Encontre os pontos de coleta no mapa.","total":1},
    {"text":"Colete 20 Peças de Metal","desc":"Extraia todos os materiais disponíveis.","total":20},
    {"text":"Extraia com os recursos","desc":"Saia da zona com tudo coletado.","total":1}
  ]'::jsonb,
  '[
    {"name":"ARC Spotter","type":"Máquina Leve","dots":2,"color":"#b477ff","image":"/assets/bots/arc_spotter.png"},
    {"name":"ARC Leaper","type":"Máquina Leve","dots":3,"color":"#b477ff","image":"/assets/bots/arc_leaper.png"}
  ]'::jsonb,
  88, 2340, '9m 44s', 'Myst', true
),

-- 3. Ajuda aos Raiders
(
  'Diário', 'Básico',
  'Ajuda aos Raiders',
  'Conclua 3 trades ou ajude outros Raiders a sobreviver durante uma extração.',
  'A comunidade de Raiders precisa de ajuda. Complete trades ou auxilie outros jogadores em situações de perigo durante extrações.',
  '/assets/bots/arc_hornet.png',
  'Complete 3 trades ou resgates', 3, 80, 150, null,
  'Barragem', '5 - 15 min', 'Qualquer', 'Variado', 'Baixo',
  now() + interval '8 hours', null,
  'Complete tudo no mesmo dia', '+10% XP bônus',
  '[
    {"kind":"currency","amount":80},
    {"kind":"xp","amount":150}
  ]'::jsonb,
  '[
    {"text":"Ajude 1 Raider","desc":"Complete um trade ou resgate.","total":1},
    {"text":"Complete 3 trades/resgates","desc":"Ajude outros Raiders ao total.","total":3}
  ]'::jsonb,
  '[
    {"name":"Outros Raiders","type":"Jogadores","dots":2,"color":"#5fa8ff","image":"/assets/bots/arc_spotter.png"}
  ]'::jsonb,
  92, 4210, '4m 30s', 'Yoda', true
),

-- 4. Honra aos Vigilantes
(
  'Facção', 'Lendário',
  'Honra aos Vigilantes',
  'Complete uma missão de reconhecimento em nome dos Vigilantes e reporte os dados coletados.',
  'Os Vigilantes precisam de dados críticos do Complexo ARC. Esta missão especial é exclusiva para membros de alto escalão da facção. Apenas os mais habilidosos devem aceitar.',
  '/assets/bots/arc_surveyor.png',
  'Complete a missão de reconhecimento', 1, 400, 600, 150,
  'Complexo ARC', '30 - 45 min', 'Madrugada', 'Neblina densa', 'Extremo',
  now() + interval '4 days 2 hours', 'dourada',
  'Complete sem acionar alarmes', '+150 REP Facção',
  '[
    {"kind":"currency","amount":400},
    {"kind":"xp","amount":600},
    {"kind":"item","item_name":"Componentes Elétricos Avançados","item_image":"/assets/items/advanced_electrical_components.png","item_qty":1}
  ]'::jsonb,
  '[
    {"text":"Infiltre-se no Complexo ARC","desc":"Entre sem ser detectado pelos sistemas de segurança.","total":1},
    {"text":"Colete dados de reconhecimento","desc":"Acesse os terminais de dados dos Vigilantes.","total":3},
    {"text":"Reporte e extraia","desc":"Transmita os dados e saia com vida.","total":1}
  ]'::jsonb,
  '[
    {"name":"ARC Guardian","type":"Máquina Pesada","dots":4,"color":"#F5090D","image":"/assets/bots/arc_sentinel.png"},
    {"name":"ARC Matriarch","type":"Máquina Lendária","dots":4,"color":"#F5090D","image":"/assets/bots/arc_matriarch.png"},
    {"name":"ARC Scout","type":"Máquina Leve","dots":3,"color":"#b477ff","image":"/assets/bots/arc_snitch.png"}
  ]'::jsonb,
  45, 312, '28m 55s', 'Bruninzor', true
);

-- Storage bucket para imagens de contratos
insert into storage.buckets (id, name, public)
values ('contract-images', 'contract-images', true)
on conflict (id) do nothing;

create policy "contract_images_select" on storage.objects
  for select using (bucket_id = 'contract-images');

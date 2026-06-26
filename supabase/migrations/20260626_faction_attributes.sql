-- Adiciona atributos do comparativo rápido a cada facção.
-- Aditivo — sem DROP.

alter table public.factions
  add column if not exists attributes jsonb not null default '{}';

-- Preenche os valores existentes
update public.factions set attributes = '{"combate":2,"recursos":3,"comercio":1,"tecnologia":1,"sobrevivencia":2}' where slug = 'guardia';
update public.factions set attributes = '{"combate":3,"recursos":1,"comercio":1,"tecnologia":1,"sobrevivencia":2}' where slug = 'mantikor';
update public.factions set attributes = '{"combate":1,"recursos":2,"comercio":3,"tecnologia":1,"sobrevivencia":1}' where slug = 'erma-cora';
update public.factions set attributes = '{"combate":2,"recursos":1,"comercio":2,"tecnologia":3,"sobrevivencia":1}' where slug = 'kozma-ventures';
update public.factions set attributes = '{"combate":1,"recursos":2,"comercio":1,"tecnologia":2,"sobrevivencia":3}' where slug = 'jiangsu-romagna';

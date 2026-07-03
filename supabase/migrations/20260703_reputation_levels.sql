-- Limiares dos níveis de reputação (editável pelo admin)

create table if not exists public.reputation_levels (
  name       text    primary key,
  min_points integer not null default 0,
  position   integer not null default 0,
  color      text    not null default '#566171'
);

insert into public.reputation_levels (name, min_points, position, color) values
  ('Sucateiro de Fundo',    0,     0, '#566171'),
  ('Mascate Novato',        200,   1, '#8b99aa'),
  ('Coletor Experiente',    500,   2, '#3df28b'),
  ('Negociante Confiável',  1000,  3, '#5fa8ff'),
  ('Mercador Veterano',     2500,  4, '#b477ff'),
  ('Fornecedor Respeitado', 5000,  5, '#ffd400'),
  ('Atravessador de Elite', 10000, 6, '#ff8c00'),
  ('Lenda da Sucatão',      20000, 7, '#ff4d6a')
on conflict (name) do nothing;

-- Sem RLS — somente admin client acessa (service role bypassa RLS)

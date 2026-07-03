-- Configurações de ganho de reputação por evento (editável pelo admin)

create table if not exists public.reputation_settings (
  source     text primary key,
  points     integer not null default 0,
  label      text    not null default '',
  updated_at timestamptz not null default now()
);

-- Valores iniciais
insert into public.reputation_settings (source, points, label) values
  ('trade',        50,  'Trade concluído com Sucatão'),
  ('contract',     100, 'Missão de contrato concluída'),
  ('daily_streak', 10,  'Atividade diária consecutiva')
on conflict (source) do nothing;

-- Sem RLS — somente admin client acessa (service role bypassa RLS)

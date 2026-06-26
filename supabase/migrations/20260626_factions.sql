-- Sistema de facções — aditivo, sem DROP.

-- Tabela principal de facções
create table if not exists public.factions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,               -- ex: "catadores", usado para mapear comparativo
  name        text not null,
  tagline     text not null default '',
  description text not null default '',
  color       text not null default '#ffffff',    -- hex
  icon_url    text null,                          -- Storage URL
  bonuses     jsonb not null default '[]',        -- array de strings
  active      boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Tabela de filiações (histórico extensível)
create table if not exists public.user_factions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  faction_id uuid not null references public.factions(id) on delete restrict,
  joined_at  timestamptz not null default now()
);

-- Feed de atividades das facções (gerenciado pelo admin)
create table if not exists public.faction_activity (
  id         uuid primary key default gen_random_uuid(),
  faction_id uuid not null references public.factions(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.factions         enable row level security;
alter table public.user_factions    enable row level security;
alter table public.faction_activity enable row level security;

create policy "factions_select_all"      on public.factions         for select using (true);
create policy "user_factions_select_own" on public.user_factions    for select using (auth.uid() = user_id);
create policy "faction_activity_select"  on public.faction_activity for select using (true);

-- Seed: 5 facções fixas
insert into public.factions (slug, name, tagline, description, color, bonuses, position) values
  ('catadores',    'Catadores',    'Recuperamos tudo.',                            'Especialistas em coleta e reciclagem. Transformamos sucata em oportunidades.',           '#3df28b', '["+ 15% de valor em itens de recursos","-10% de reputação em entregas de recursos","+5% de Sucatas em contratos"]',           1),
  ('mercadores',   'Mercadores',   'Comércio é poder.',                            'Mestres das negociações e do mercado. Conseguimos o que ninguém mais consegue.',          '#ffd400', '["+15% de Sucatas em todas as vendas","-10% de taxa no mercado","+5% de desconto na Loja do Sucatão"]',               2),
  ('cacadores',    'Caçadores',    'Caçamos máquinas. Caçamos lendas.',            'Guerreiros implacáveis. Caçamos ARC e garantimos segurança para todos.',                  '#ff6171', '["+15% de dano contra ARC","-10% de reputação em itens de combate","+5% de XP no Contrato do Sucatão"]',             3),
  ('vigilantes',   'Vigilantes',   'Conhecimento é arma. Informação é poder.',     'Especialistas em tecnologia e inteligência. Sabemos o que os outros não sabem.',          '#5fa8ff', '["+15% de XP em contratos","-10% de reputação em operações especiais","+5% de chance em itens raros"]',              4),
  ('sobreviventes','Sobreviventes','Unidos sobrevivemos. Divididos caímos.',        'Focados em comunidade e cooperação. A força está na união dos Raiders.',                  '#b477ff', '["+15% de vida e resistência","-10% de reputação em atividades de grupo","+5% de Sucatas em eventos"]',            5)
on conflict (slug) do nothing;

-- Seed: atividades iniciais
insert into public.faction_activity (faction_id, text) values
  ((select id from public.factions where slug = 'catadores'),    'Os Catadores concluíram 1.250 entregas hoje'),
  ((select id from public.factions where slug = 'mercadores'),   'Os Mercadores movimentaram 2.4M sucatas'),
  ((select id from public.factions where slug = 'cacadores'),    'Os Caçadores destruíram 3 Titãs ARC'),
  ((select id from public.factions where slug = 'vigilantes'),   'Os Vigilantes decifraram novos dados'),
  ((select id from public.factions where slug = 'sobreviventes'),'Os Sobreviventes completaram 780 resgates')
on conflict do nothing;

-- Storage bucket para ícones das facções
insert into storage.buckets (id, name, public)
values ('faction-icons', 'faction-icons', true)
on conflict (id) do nothing;

create policy "faction_icons_select" on storage.objects
  for select using (bucket_id = 'faction-icons');

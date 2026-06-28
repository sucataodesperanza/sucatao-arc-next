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

-- Seed: 5 facções
insert into public.factions (slug, name, tagline, description, color, icon_url, bonuses, position) values
  ('guardia',          'Guardia',          'Protegemos o que importa.',             'Guardiões do Sucatão. Especialistas em defesa e coleta de recursos estratégicos.',      '#3df28b', '/assets/faccoes/guardia.png',          '["+15% de valor em itens de recursos","-10% de reputação em entregas de recursos","+5% de Sucatas em contratos"]',      1),
  ('mantikor',         'Mantikor',         'Força bruta. Resultados reais.',         'Caçadores implacáveis de ARC. Onde há perigo, Mantikor está na frente.',                '#ff6171', '/assets/faccoes/mantikor.png',         '["+15% de dano contra ARC","-10% de reputação em itens de combate","+5% de XP no Contrato do Sucatão"]',            2),
  ('erma-cora',        'Erma Cora',        'Comércio é arte. Negócio é poder.',      'Mestres das negociações. Controlam o mercado e abrem portas que outros não conseguem.', '#ffd400', '/assets/faccoes/erma-cora.png',        '["+15% de Sucatas em todas as vendas","-10% de taxa no mercado","+5% de desconto na Loja do Sucatão"]',               3),
  ('kozma-ventures',   'Kozma Ventures',   'Dados. Estratégia. Vantagem.',           'Especialistas em tecnologia e inteligência. Sabemos o que os outros nunca saberão.',    '#5fa8ff', '/assets/faccoes/kozma-ventures.png',   '["+15% de XP em contratos","-10% de reputação em operações especiais","+5% de chance em itens raros"]',              4),
  ('jiangsu-romagna',  'Jiangsu Romagna',  'Unidos somos maiores que a máquina.',    'Focados em comunidade e cooperação. A força do Sucatão está na união dos Raiders.',     '#b477ff', '/assets/faccoes/jiangsu-romagna.png',  '["+15% de vida e resistência","-10% de reputação em atividades de grupo","+5% de Sucatas em eventos"]',            5)
on conflict (slug) do nothing;

-- Seed: atividades iniciais
insert into public.faction_activity (faction_id, text) values
  ((select id from public.factions where slug = 'guardia'),         'Guardia concluiu 1.250 entregas hoje'),
  ((select id from public.factions where slug = 'mantikor'),        'Mantikor destruiu 3 Titãs ARC'),
  ((select id from public.factions where slug = 'erma-cora'),       'Erma Cora movimentou 2.4M sucatas'),
  ((select id from public.factions where slug = 'kozma-ventures'),  'Kozma Ventures decifrou novos dados ARC'),
  ((select id from public.factions where slug = 'jiangsu-romagna'), 'Jiangsu Romagna completou 780 resgates')
on conflict do nothing;

-- Storage bucket para ícones das facções
insert into storage.buckets (id, name, public)
values ('faction-icons', 'faction-icons', true)
on conflict (id) do nothing;

create policy "faction_icons_select" on storage.objects
  for select using (bucket_id = 'faction-icons');

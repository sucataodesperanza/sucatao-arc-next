-- Corrige tabela streamers: garante todas as colunas e policies.
-- Aditivo — sem DROP.

-- Garante colunas que podem estar faltando se a tabela foi criada parcialmente
alter table public.streamers add column if not exists platform     text not null default 'twitch';
alter table public.streamers add column if not exists channel_url  text null;
alter table public.streamers add column if not exists avatar_url   text null;
alter table public.streamers add column if not exists viewers_text text not null default '';
alter table public.streamers add column if not exists verified     boolean not null default false;
alter table public.streamers add column if not exists active       boolean not null default true;
alter table public.streamers add column if not exists position     integer not null default 0;
alter table public.streamers add column if not exists color        text not null default '#5fa8ff';
alter table public.streamers add column if not exists created_at   timestamptz not null default now();

-- RLS
alter table public.streamers enable row level security;

-- Recria a policy com drop seguro
drop policy if exists "streamers_select_active" on public.streamers;
create policy "streamers_select_active" on public.streamers for select using (active = true);

-- Bucket de avatares
insert into storage.buckets (id, name, public)
values ('streamer-avatars', 'streamer-avatars', true)
on conflict (id) do nothing;

drop policy if exists "streamer_avatars_select" on storage.objects;
create policy "streamer_avatars_select" on storage.objects
  for select using (bucket_id = 'streamer-avatars');

-- Seed
insert into public.streamers (name, platform, viewers_text, verified, position, color, avatar_url) values
  ('Patife',    'twitch', '8.2K', true,  1, '#7c3aed', '/assets/bots/arc_sentinel.png'),
  ('Yoda',      'twitch', '5.1K', true,  2, '#3df28b', '/assets/bots/arc_shredder.png'),
  ('Hayashii',  'twitch', '3.7K', true,  3, '#ffd400', '/assets/bots/arc_spotter.png'),
  ('Marginal',  'twitch', '2.9K', true,  4, '#F5090D', '/assets/bots/arc_matriarch.png'),
  ('Bruninzor', 'twitch', '1.8K', false, 5, '#5fa8ff', '/assets/bots/arc_leaper.png')
on conflict do nothing;

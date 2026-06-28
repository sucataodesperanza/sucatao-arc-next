-- Streamers parceiros do Sucatão.
create table if not exists public.streamers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  platform     text not null default 'twitch',  -- twitch | youtube | kick
  channel_url  text null,
  avatar_url   text null,
  viewers_text text not null default '',          -- ex: "8.2K"
  verified     boolean not null default false,
  active       boolean not null default true,
  position     integer not null default 0,
  color        text not null default '#5fa8ff',   -- cor de destaque
  created_at   timestamptz not null default now()
);

alter table public.streamers enable row level security;
create policy "streamers_select_active" on public.streamers for select using (active = true);

-- Seed com os dados atuais
insert into public.streamers (name, platform, viewers_text, verified, position, color, avatar_url) values
  ('Patife',    'twitch', '8.2K', true,  1, '#7c3aed', '/assets/bots/arc_sentinel.png'),
  ('Yoda',      'twitch', '5.1K', true,  2, '#3df28b', '/assets/bots/arc_shredder.png'),
  ('Hayashii',  'twitch', '3.7K', true,  3, '#ffd400', '/assets/bots/arc_spotter.png'),
  ('Marginal',  'twitch', '2.9K', true,  4, '#F5090D', '/assets/bots/arc_matriarch.png'),
  ('Bruninzor', 'twitch', '1.8K', false, 5, '#5fa8ff', '/assets/bots/arc_leaper.png')
on conflict do nothing;

-- Bucket de avatares
insert into storage.buckets (id, name, public)
values ('streamer-avatars', 'streamer-avatars', true)
on conflict (id) do nothing;

create policy "streamer_avatars_select" on storage.objects
  for select using (bucket_id = 'streamer-avatars');

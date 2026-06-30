alter table public.profiles
  add column if not exists discord_id       text null,
  add column if not exists discord_username text null,
  add column if not exists discord_avatar   text null;

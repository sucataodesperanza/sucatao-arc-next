-- Aditivo: historia da faccao + reputacao/nivel inicial em user_factions

alter table public.factions
  add column if not exists story text not null default '';

alter table public.user_factions
  add column if not exists reputation   int not null default 0,
  add column if not exists faction_level int not null default 1;

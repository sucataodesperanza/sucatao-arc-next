-- Tabela de mapas do ARC Raiders.
-- Substitui o array maps[] do arc-data.js.
-- Aditivo: não altera nem remove nada existente.

create table if not exists public.maps (
  id text primary key,
  name text not null,
  label text null,
  description text null,
  image text null,
  status text not null default 'ready',
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.maps enable row level security;

create policy "maps_select_active_public" on public.maps
  for select using (active = true);

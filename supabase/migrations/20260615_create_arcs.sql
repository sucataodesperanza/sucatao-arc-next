-- Arcpedia: dados dos ARCs (inimigos), combinando MetaForge (descrição/imagem)
-- com os dados locais de arc-data.js (ameaça, fraqueza, XP, drops).
-- Aditivo: não altera nem remove nada das tabelas existentes.

create table if not exists public.arcs (
  id text primary key,
  name text not null,
  name_en text not null,
  description text null,
  description_en text null,
  type text null,
  threat text null,
  weakness text null,
  weakness_en text null,
  destroy_xp integer null,
  loot_xp integer null,
  drops jsonb null,
  icon_url text null,
  image_url text null,
  guide_url text null,
  active boolean not null default true,
  synced_at timestamptz null
);

create index if not exists arcs_threat_idx on public.arcs (threat);
create index if not exists arcs_active_idx on public.arcs (active);

alter table public.arcs enable row level security;

create policy "arcs_select_active_public" on public.arcs
  for select using (active = true);

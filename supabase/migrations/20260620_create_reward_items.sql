-- Itens de recompensa: gift cards, merch, sorteios.
-- Separados de catalog_items (que são itens do jogo ARC Raiders).
-- Tipo "recompensa" distingue desses itens de jogo ("arc").
-- Aditivo: não altera nada existente.

create table if not exists public.reward_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text null,
  image_url   text null,
  price       integer not null default 0,   -- em pontos do site
  stock       integer not null default 0,
  featured    boolean not null default false,
  expires_at  timestamptz null,             -- quando este destaque expira/roda
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reward_items_featured_idx on public.reward_items (featured) where featured = true;
create index if not exists reward_items_active_idx   on public.reward_items (active)   where active = true;

alter table public.reward_items enable row level security;

create policy "reward_items_select_active" on public.reward_items
  for select using (active = true);

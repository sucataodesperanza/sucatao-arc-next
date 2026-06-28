-- Sistema Econômico do Sucatão — aditivo, sem DROP.
-- Phase 2: traders, quests
-- Phase 3: economy_logs, item_economics + VEI

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 — Dados importados do MetaForge
-- ─────────────────────────────────────────────────────────────────────────────

-- Traders (comerciantes in-game)
create table if not exists public.game_traders (
  id          text primary key,            -- id do MetaForge
  name        text not null,
  items       jsonb not null default '[]', -- [{itemId, price, currency}]
  synced_at   timestamptz not null default now()
);

-- Quests (missões do jogo)
create table if not exists public.game_quests (
  id              text primary key,
  name            text not null,
  description     text not null default '',
  required_items  jsonb not null default '[]', -- [{itemId, qty}]
  reward          jsonb not null default '{}', -- {xp, items[], currency}
  difficulty      text not null default '',
  synced_at       timestamptz not null default now()
);

-- RLS: leitura pública
alter table public.game_traders enable row level security;
alter table public.game_quests  enable row level security;
create policy "game_traders_select" on public.game_traders for select using (true);
create policy "game_quests_select"  on public.game_quests  for select using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — Economia exclusiva do Sucatão
-- ─────────────────────────────────────────────────────────────────────────────

-- Log de todos os movimentos econômicos
create table if not exists public.economy_logs (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references auth.users(id) on delete cascade,
  action      text not null,             -- 'buy' | 'sell' | 'trade' | 'reward' | 'contract' | 'auction' | 'admin'
  value       numeric(12,2) not null,
  currency    text not null default 'points', -- 'points' | 'cash'
  item_id     text null references public.catalog_items(id) on delete set null,
  item_qty    integer not null default 1,
  source      text not null,             -- 'shop' | 'trade' | 'contract' | 'auction' | 'lottery' | 'inventory' | 'reward' | 'admin'
  source_id   text null,                 -- id da entidade de origem (ex: order_id, trade_id)
  metadata    jsonb null,                -- dados extras
  created_at  timestamptz not null default now()
);

alter table public.economy_logs enable row level security;
create policy "economy_logs_select_own" on public.economy_logs for select using (auth.uid() = player_id);

create index if not exists idx_economy_logs_player   on public.economy_logs(player_id, created_at desc);
create index if not exists idx_economy_logs_source   on public.economy_logs(source, created_at desc);
create index if not exists idx_economy_logs_item     on public.economy_logs(item_id)   where item_id is not null;
create index if not exists idx_economy_logs_created  on public.economy_logs(created_at desc);

-- Métricas econômicas por item (campos exclusivos do Sucatão)
create table if not exists public.item_economics (
  item_id              text primary key references public.catalog_items(id) on delete cascade,
  vei                  numeric(10,4) not null default 0, -- Valor Econômico do Item
  market_price         numeric(10,2) null,               -- preço médio de mercado
  average_trade_price  numeric(10,2) null,               -- preço médio nos trades
  trade_count          integer not null default 0,
  weekly_demand        integer not null default 0,       -- trades na última semana
  weekly_supply        integer not null default 0,
  liquidity_score      numeric(5,2) not null default 0,  -- 0-100
  contract_frequency   integer not null default 0,       -- quantas vezes apareceu em contratos
  auction_frequency    integer not null default 0,
  favorites            integer not null default 0,
  views                integer not null default 0,
  watchlist_count      integer not null default 0,
  last_calculated_at   timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.item_economics enable row level security;
create policy "item_economics_select" on public.item_economics for select using (true);

create index if not exists idx_item_economics_vei       on public.item_economics(vei desc);
create index if not exists idx_item_economics_demand    on public.item_economics(weekly_demand desc);
create index if not exists idx_item_economics_liquidity on public.item_economics(liquidity_score desc);

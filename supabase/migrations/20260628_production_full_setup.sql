-- =============================================================================
-- MIGRATION DE PRODUÇÃO — SUCATÃO DESPERANÇA
-- Aditivo: usa IF NOT EXISTS e ADD COLUMN IF NOT EXISTS em tudo.
-- Não remove, não trunca, não altera dados existentes.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FUNÇÃO UTILITÁRIA
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. COLUNAS FALTANDO EM TABELAS EXISTENTES
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles
alter table public.profiles
  add column if not exists points             integer      not null default 0,
  add column if not exists inventory_capacity integer      not null default 100;

-- catalog_items
alter table public.catalog_items
  add column if not exists recipe           jsonb   null,
  add column if not exists obtained_from    jsonb   null,
  add column if not exists recycled_into    jsonb   null,
  add column if not exists recovered_into   jsonb   null,
  add column if not exists arc_item_id      text    null,
  add column if not exists used_in_crafting text[]  null;

-- stock_items
alter table public.stock_items
  add column if not exists price_points integer       not null default 0,
  add column if not exists price_cash   numeric(10,2) not null default 0;

-- streamers: colunas antigas not null → nullable
alter table public.streamers alter column username   drop not null;
alter table public.streamers alter column url        drop not null;
alter table public.streamers alter column avatar_url drop not null;

-- streamers: novas colunas
alter table public.streamers
  add column if not exists channel_url  text    null,
  add column if not exists viewers_text text    not null default '',
  add column if not exists verified     boolean not null default false,
  add column if not exists active       boolean not null default true,
  add column if not exists position     integer not null default 0,
  add column if not exists color        text    not null default '#5fa8ff';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ARCS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.arcs (
  id             text primary key,
  name           text not null,
  name_en        text not null default '',
  description    text,
  description_en text,
  type           text,
  threat         text,
  weakness       text,
  weakness_en    text,
  destroy_xp     integer,
  loot_xp        integer,
  drops          jsonb not null default '[]',
  icon_url       text,
  image_url      text,
  guide_url      text,
  active         boolean not null default true,
  synced_at      timestamptz
);
alter table public.arcs enable row level security;
create policy "arcs_select_active_public" on public.arcs
  for select using (active = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. MAPAS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.maps (
  id            text primary key,
  name          text not null,
  label         text not null default '',
  description   text,
  image_url     text,
  status        text not null default 'coming_soon',
  index         integer not null default 0,
  metaforge_id  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.maps enable row level security;
create policy "maps_select_all" on public.maps for select using (true);

create table if not exists public.map_markers (
  id         uuid primary key default gen_random_uuid(),
  map_id     text not null references public.maps(id) on delete cascade,
  type       text not null,
  x          numeric not null,
  y          numeric not null,
  title      text not null,
  note       text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.map_markers enable row level security;
create policy "map_markers_select_all" on public.map_markers
  for select using (active = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TRADES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.trade_settings (
  id                      integer primary key default 1 check (id = 1),
  operating_hours_start   time not null default '08:00',
  operating_hours_end     time not null default '22:00',
  slot_duration_minutes   integer not null default 60,
  updated_at              timestamptz not null default now()
);
insert into public.trade_settings (id) values (1) on conflict (id) do nothing;
alter table public.trade_settings enable row level security;
create policy "trade_settings_select_all" on public.trade_settings for select using (true);

create table if not exists public.trade_slots (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,
  scheduled_for  timestamptz not null,
  capacity       integer not null default 10,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);
alter table public.trade_slots enable row level security;
create policy "trade_slots_select_active" on public.trade_slots
  for select using (active = true);

create table if not exists public.trades (
  id                 uuid primary key default gen_random_uuid(),
  offer_points       integer not null default 0,
  want_item_name     text not null,
  want_item_qty      integer not null default 1,
  want_item_icon     text,
  want_item_rarity   text,
  status             text not null default 'active',
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.trades enable row level security;
create policy "trades_select_active" on public.trades
  for select using (status = 'active');

create table if not exists public.trade_acceptances (
  id            uuid primary key default gen_random_uuid(),
  trade_id      uuid not null references public.trades(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  slot_id       uuid null references public.trade_slots(id) on delete set null,
  game_id       text null,
  scheduled_at  timestamptz null,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (trade_id, user_id)
);
alter table public.trade_acceptances enable row level security;
create policy "trade_acceptances_select_own" on public.trade_acceptances
  for select using (auth.uid() = user_id);
create policy "trade_acceptances_insert_own" on public.trade_acceptances
  for insert with check (auth.uid() = user_id);
create policy "trade_acceptances_update_own" on public.trade_acceptances
  for update using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INVENTÁRIO
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.user_inventory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null references public.catalog_items(id) on delete cascade,
  quantity    integer not null default 1 check (quantity >= 0),
  acquired_at timestamptz not null default now(),
  unique (user_id, item_id)
);
alter table public.user_inventory enable row level security;
create policy "user_inventory_select_own" on public.user_inventory
  for select using (auth.uid() = user_id);

create table if not exists public.inventory_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null references public.catalog_items(id) on delete cascade,
  quantity    integer not null,
  source      text not null default 'shop',
  acquired_at timestamptz not null default now()
);
alter table public.inventory_history enable row level security;
create policy "inventory_history_select_own" on public.inventory_history
  for select using (auth.uid() = user_id);

-- Função para adicionar itens ao inventário (upsert)
create or replace function public.add_items_to_inventory(p_user_id uuid, p_items jsonb)
returns void language plpgsql security definer as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.user_inventory (user_id, item_id, quantity)
    values (p_user_id, item->>'itemId', (item->>'quantity')::integer)
    on conflict (user_id, item_id)
    do update set quantity = public.user_inventory.quantity + (item->>'quantity')::integer;
  end loop;
end;
$$;

-- Função para decrementar estoque
create or replace function public.decrement_stock(p_items jsonb)
returns void language plpgsql security definer as $$
declare
  item       jsonb;
  v_item_id  text;
  v_qty      integer;
  v_remaining integer;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := item->>'itemId';
    v_qty := (item->>'quantity')::integer;
    update public.stock_items
      set quantity = quantity - v_qty, updated_at = now()
      where catalog_item_id = v_item_id and quantity >= v_qty
      returning quantity into v_remaining;
    if not found then
      raise exception 'Estoque insuficiente para o item %', v_item_id;
    end if;
  end loop;
end;
$$;

-- Função para restaurar estoque
create or replace function public.restore_stock(p_items jsonb)
returns void language plpgsql security definer as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update public.stock_items
      set quantity = quantity + (item->>'quantity')::integer, updated_at = now()
      where catalog_item_id = item->>'itemId';
  end loop;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RECOMPENSAS (LOJA SEMANAL)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.reward_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  price       integer not null default 0,
  stock       integer not null default 0,
  featured    boolean not null default false,
  expires_at  timestamptz,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.reward_items enable row level security;
create policy "reward_items_select_active" on public.reward_items
  for select using (active = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FACÇÕES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.factions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  description text not null default '',
  color       text not null default '#ffffff',
  icon_url    text,
  bonuses     jsonb not null default '[]',
  attributes  jsonb not null default '{}',
  active      boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.factions enable row level security;
create policy "factions_select_all" on public.factions for select using (true);

create table if not exists public.user_factions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade unique,
  faction_id uuid not null references public.factions(id) on delete cascade,
  joined_at  timestamptz not null default now()
);
alter table public.user_factions enable row level security;
create policy "user_factions_select_own" on public.user_factions
  for select using (auth.uid() = user_id);

create table if not exists public.faction_activity (
  id         uuid primary key default gen_random_uuid(),
  faction_id uuid not null references public.factions(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);
alter table public.faction_activity enable row level security;
create policy "faction_activity_select" on public.faction_activity for select using (true);

create table if not exists public.user_faction_activity (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  faction_id   uuid not null references public.factions(id) on delete cascade,
  display_name text not null default '',
  text         text not null,
  points       integer not null default 0,
  event_type   text not null default 'general',
  created_at   timestamptz not null default now()
);
alter table public.user_faction_activity enable row level security;
create policy "ufa_select_own" on public.user_faction_activity
  for select using (auth.uid() = user_id);
create policy "ufa_select_faction" on public.user_faction_activity
  for select using (
    faction_id in (select faction_id from public.user_factions where user_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. CONTRATOS
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.contracts (
  id                   uuid primary key default gen_random_uuid(),
  faction_id           uuid null references public.factions(id) on delete set null,
  type                 text not null default 'daily',
  tier                 text not null default 'comum',
  title                text not null,
  description          text not null default '',
  story                text,
  image_url            text,
  objective            text not null default '',
  total                integer not null default 1,
  sucatas              integer not null default 0,
  xp                   integer not null default 0,
  rep                  integer not null default 0,
  location             text,
  estimated_time       text,
  best_time_of_day     text,
  climate              text,
  environmental_risk   text,
  expires_at           timestamptz,
  variant              text,
  bonus_condition      text,
  bonus_reward         text,
  rewards              jsonb not null default '[]',
  objectives           jsonb not null default '[]',
  enemies              jsonb not null default '[]',
  success_rate         numeric,
  players_completed    integer not null default 0,
  best_record_time     text,
  best_record_player   text,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);
alter table public.contracts enable row level security;
create policy "contracts_select_active" on public.contracts
  for select using (active = true);

create table if not exists public.user_contracts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  contract_id  uuid not null references public.contracts(id) on delete cascade,
  progress     integer not null default 0,
  status       text not null default 'active',
  accepted_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, contract_id)
);
alter table public.user_contracts enable row level security;
create policy "user_contracts_select_own" on public.user_contracts
  for select using (auth.uid() = user_id);

-- Grupos de contrato (contratos sequenciais / passes)
create table if not exists public.contract_groups (
  id           uuid primary key default gen_random_uuid(),
  faction_id   uuid null references public.factions(id) on delete set null,
  title        text not null,
  description  text not null default '',
  type         text not null default 'weekly',
  image_url    text,
  price_points integer not null default 0,
  price_real   numeric(10,2) not null default 0,
  starts_at    timestamptz,
  expires_at   timestamptz,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.contract_groups enable row level security;
create policy "cgroups_select_active" on public.contract_groups
  for select using (active = true and (expires_at is null or expires_at >= now()));

create table if not exists public.contract_group_missions (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.contract_groups(id) on delete cascade,
  position     integer not null,
  title        text not null,
  description  text not null default '',
  total        integer not null default 1,
  points_reward integer not null default 0,
  item_reward  jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (group_id, position)
);
alter table public.contract_group_missions enable row level security;
create policy "cgmissions_select" on public.contract_group_missions
  for select using (
    group_id in (select id from public.contract_groups where active = true)
  );

create table if not exists public.user_mission_completions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  group_id        uuid not null references public.contract_groups(id) on delete cascade,
  mission_id      uuid not null references public.contract_group_missions(id) on delete cascade,
  points_credited integer not null default 0,
  completed_at    timestamptz not null default now(),
  unique (user_id, mission_id)
);
alter table public.user_mission_completions enable row level security;
create policy "umc_select_own" on public.user_mission_completions
  for select using (auth.uid() = user_id);

create table if not exists public.contract_mission_schedules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  group_id      uuid not null references public.contract_groups(id) on delete cascade,
  mission_id    uuid not null references public.contract_group_missions(id) on delete cascade,
  scheduled_at  timestamptz not null,
  game_id       text not null,
  status        text not null default 'pending',
  expires_at    timestamptz,
  confirmed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, mission_id)
);
alter table public.contract_mission_schedules enable row level security;
create policy "cms_select_own" on public.contract_mission_schedules
  for select using (auth.uid() = user_id);

create table if not exists public.user_contract_group_purchases (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  group_id       uuid not null references public.contract_groups(id) on delete cascade,
  payment_method text not null default 'points',
  order_id       uuid null references public.orders(id) on delete set null,
  purchased_at   timestamptz not null default now(),
  unique (user_id, group_id)
);
alter table public.user_contract_group_purchases enable row level security;
create policy "ucgp_select_own" on public.user_contract_group_purchases
  for select using (auth.uid() = user_id);

create table if not exists public.contract_point_rewards (
  id               uuid primary key default gen_random_uuid(),
  item_id          text not null references public.catalog_items(id) on delete cascade,
  points_threshold integer not null default 0,
  active           boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);
alter table public.contract_point_rewards enable row level security;
create policy "cpr_select_active" on public.contract_point_rewards
  for select using (active = true);

-- Adiciona pass_group_id em orders (se não existir)
alter table public.orders
  add column if not exists pass_group_id uuid null references public.contract_groups(id) on delete set null;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. CONTEÚDO DA HOME
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.home_news (
  id         uuid primary key default gen_random_uuid(),
  date_label text not null default '',
  title      text not null,
  text       text not null default '',
  image_url  text,
  href       text not null default '#',
  icon_name  text not null default 'Bell',
  active     boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.home_news enable row level security;
create policy "home_news_select" on public.home_news
  for select using (active = true);

create table if not exists public.home_slides (
  id         uuid primary key default gen_random_uuid(),
  tag        text not null default '',
  icon_name  text not null default 'Zap',
  image_url  text,
  title      text not null,
  text       text not null default '',
  cta_label  text not null default 'Ver mais',
  cta_href   text not null default '#',
  active     boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.home_slides enable row level security;
create policy "home_slides_select" on public.home_slides
  for select using (active = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. ECONOMIA
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.game_traders (
  id        text primary key,
  name      text not null,
  items     jsonb not null default '[]',
  synced_at timestamptz not null default now()
);
alter table public.game_traders enable row level security;
create policy "game_traders_select" on public.game_traders for select using (true);

create table if not exists public.game_quests (
  id             text primary key,
  name           text not null,
  description    text not null default '',
  required_items jsonb not null default '[]',
  reward         jsonb not null default '{}',
  difficulty     text not null default '',
  synced_at      timestamptz not null default now()
);
alter table public.game_quests enable row level security;
create policy "game_quests_select" on public.game_quests for select using (true);

create table if not exists public.economy_logs (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references auth.users(id) on delete cascade,
  action     text not null,
  value      numeric(12,2) not null,
  currency   text not null default 'points',
  item_id    text null references public.catalog_items(id) on delete set null,
  item_qty   integer not null default 1,
  source     text not null,
  source_id  text null,
  metadata   jsonb null,
  created_at timestamptz not null default now()
);
alter table public.economy_logs enable row level security;
create policy "economy_logs_select_own" on public.economy_logs
  for select using (auth.uid() = player_id);
create index if not exists idx_economy_logs_player  on public.economy_logs(player_id, created_at desc);
create index if not exists idx_economy_logs_source  on public.economy_logs(source, created_at desc);
create index if not exists idx_economy_logs_item    on public.economy_logs(item_id) where item_id is not null;
create index if not exists idx_economy_logs_created on public.economy_logs(created_at desc);

create table if not exists public.item_economics (
  item_id              text primary key references public.catalog_items(id) on delete cascade,
  vei                  numeric(10,4) not null default 0,
  market_price         numeric(10,2) null,
  average_trade_price  numeric(10,2) null,
  trade_count          integer not null default 0,
  weekly_demand        integer not null default 0,
  weekly_supply        integer not null default 0,
  liquidity_score      numeric(5,2)  not null default 0,
  contract_frequency   integer not null default 0,
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

create table if not exists public.economy_settings (
  id                integer primary key default 1 check (id = 1),
  points_multiplier numeric(10,4) not null default 100,
  cash_multiplier   numeric(10,4) not null default 0.10,
  updated_at        timestamptz not null default now()
);
insert into public.economy_settings (id) values (1) on conflict (id) do nothing;
alter table public.economy_settings enable row level security;
create policy "economy_settings_select" on public.economy_settings for select using (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. STREAMERS — INSCRIÇÕES (nova tabela, separada de partnership_applications)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.streamer_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nickname     text not null,
  platform     text not null,
  channel_url  text not null,
  message      text not null default '',
  status       text not null default 'pending',
  reviewed_by  uuid null references auth.users(id) on delete set null,
  reviewed_at  timestamptz null,
  created_at   timestamptz not null default now()
);
alter table public.streamer_applications enable row level security;
create policy "applications_select_own" on public.streamer_applications
  for select using (auth.uid() = user_id);
create policy "applications_insert_own" on public.streamer_applications
  for insert with check (auth.uid() = user_id);
create index if not exists idx_streamer_applications_user   on public.streamer_applications(user_id);
create index if not exists idx_streamer_applications_status on public.streamer_applications(status, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public) values
  ('avatars',          'avatars',          true),
  ('reward-images',    'reward-images',    true),
  ('faction-icons',    'faction-icons',    true),
  ('streamer-avatars', 'streamer-avatars', true),
  ('home-assets',      'home-assets',      true)
on conflict (id) do nothing;

-- Avatares
drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Reward images
drop policy if exists "Reward images are publicly accessible" on storage.objects;
create policy "Reward images are publicly accessible" on storage.objects
  for select using (bucket_id = 'reward-images');

drop policy if exists "Admins can upload reward images" on storage.objects;
create policy "Admins can upload reward images" on storage.objects
  for insert with check (
    bucket_id = 'reward-images' and
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can update reward images" on storage.objects;
create policy "Admins can update reward images" on storage.objects
  for update using (
    bucket_id = 'reward-images' and
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can delete reward images" on storage.objects;
create policy "Admins can delete reward images" on storage.objects
  for delete using (
    bucket_id = 'reward-images' and
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Outros buckets
drop policy if exists "faction_icons_select" on storage.objects;
create policy "faction_icons_select" on storage.objects
  for select using (bucket_id = 'faction-icons');

drop policy if exists "streamer_avatars_select" on storage.objects;
create policy "streamer_avatars_select" on storage.objects
  for select using (bucket_id = 'streamer-avatars');

drop policy if exists "home_assets_select" on storage.objects;
create policy "home_assets_select" on storage.objects
  for select using (bucket_id = 'home-assets');

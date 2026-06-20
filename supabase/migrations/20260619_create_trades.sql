-- Sistema de trades: Sucatão oferece pontos e quer receber itens dos jogadores.
-- Aditivo: não altera nada existente.

create table if not exists public.trades (
  id               uuid primary key default gen_random_uuid(),
  offer_points     integer not null default 0,
  want_item_name   text not null,
  want_item_qty    integer not null default 1,
  want_item_icon   text null,
  want_item_rarity text null,
  status           text not null default 'active', -- active | paused | completed
  expires_at       timestamptz null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists trades_status_idx on public.trades (status);
create index if not exists trades_created_at_idx on public.trades (created_at desc);

alter table public.trades enable row level security;

-- Qualquer usuário autenticado pode ver trades ativos
create policy "trades_select_active" on public.trades
  for select using (status = 'active');

-- ── Aceitações ──────────────────────────────────────────────────────────────

create table if not exists public.trade_acceptances (
  id         uuid primary key default gen_random_uuid(),
  trade_id   uuid not null references public.trades(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending', -- pending | completed | cancelled
  created_at timestamptz not null default now(),
  unique (trade_id, user_id)
);

create index if not exists trade_acceptances_user_idx on public.trade_acceptances (user_id);
create index if not exists trade_acceptances_trade_idx on public.trade_acceptances (trade_id);

alter table public.trade_acceptances enable row level security;

-- Usuário vê somente suas próprias aceitações
create policy "trade_acceptances_select_own" on public.trade_acceptances
  for select using (auth.uid() = user_id);

-- Usuário insere somente para si mesmo
create policy "trade_acceptances_insert_own" on public.trade_acceptances
  for insert with check (auth.uid() = user_id);

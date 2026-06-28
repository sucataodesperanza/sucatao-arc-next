-- Precificação baseada em VEI para o estoque.
-- Aditivo — sem DROP.

-- Adiciona price_points e price_cash ao estoque
alter table public.stock_items
  add column if not exists price_points integer      not null default 0,
  add column if not exists price_cash   numeric(10,2) not null default 0;

-- Configurações econômicas globais (singleton)
create table if not exists public.economy_settings (
  id                integer primary key default 1 check (id = 1),
  points_multiplier numeric(10,4) not null default 100,  -- VEI × mult = pts
  cash_multiplier   numeric(10,4) not null default 0.10, -- VEI × mult = R$
  updated_at        timestamptz not null default now()
);

insert into public.economy_settings (id, points_multiplier, cash_multiplier)
values (1, 100, 0.10)
on conflict (id) do nothing;

alter table public.economy_settings enable row level security;
create policy "economy_settings_select" on public.economy_settings for select using (true);

-- Passes de contrato à venda — aditivo, sem DROP.

-- Torna faction_id opcional nos grupos (null = passe geral, visível para todos)
alter table public.contract_groups
  alter column faction_id drop not null;

-- Preços do passe
alter table public.contract_groups
  add column if not exists price_points integer     not null default 0,
  add column if not exists price_real   numeric(10,2) not null default 0;

-- Liga orders a um passe (quando a compra é via PIX)
alter table public.orders
  add column if not exists pass_group_id uuid null references public.contract_groups(id) on delete set null;

-- Registro de compras de passes por usuário
create table if not exists public.user_contract_group_purchases (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  group_id       uuid not null references public.contract_groups(id) on delete cascade,
  payment_method text not null,        -- 'points' | 'pix'
  order_id       uuid null references public.orders(id) on delete set null,
  purchased_at   timestamptz not null default now(),
  unique (user_id, group_id)
);

alter table public.user_contract_group_purchases enable row level security;

create policy "ucgp_select_own" on public.user_contract_group_purchases
  for select using (auth.uid() = user_id);

create index if not exists idx_ucgp_user on public.user_contract_group_purchases(user_id);

-- Atualiza RLS de contract_groups para incluir passes gerais (faction_id IS NULL)
drop policy if exists "cgroups_select_active" on public.contract_groups;
create policy "cgroups_select_active" on public.contract_groups
  for select using (active = true and starts_at <= now() and expires_at >= now());

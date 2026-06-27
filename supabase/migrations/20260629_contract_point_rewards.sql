-- Recompensas desbloqueadas por pontos acumulados (profiles.points).
-- Exibidas na seção "Próximas Recompensas" do painel lateral de /contratos.

create table if not exists public.contract_point_rewards (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.catalog_items(id) on delete cascade,
  points_threshold integer not null,   -- quantidade de sucatas necessárias
  active           boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.contract_point_rewards enable row level security;

create policy "cpr_select_active" on public.contract_point_rewards
  for select using (active = true);

create index if not exists idx_cpr_threshold on public.contract_point_rewards(points_threshold);

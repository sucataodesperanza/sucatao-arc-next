-- Sistema de passes de batalha de facção — aditivo, sem DROP.

-- Grupo/passe (diário, semanal, mensal)
create table if not exists public.contract_groups (
  id          uuid primary key default gen_random_uuid(),
  faction_id  uuid not null references public.factions(id) on delete cascade,
  title       text not null,
  description text not null default '',
  type        text not null,          -- 'daily' | 'weekly' | 'monthly'
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Missões individuais dentro do grupo
create table if not exists public.contract_group_missions (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.contract_groups(id) on delete cascade,
  position      integer not null,       -- 1-based, define ordem sequencial
  title         text not null,
  description   text not null default '',
  total         integer not null default 1,  -- quantidade para completar
  points_reward integer not null default 0,  -- sucatas ganhas ao completar
  item_reward   jsonb null,            -- {item_name, item_image, item_qty} — em missões múltiplas de 5
  created_at    timestamptz not null default now(),
  unique (group_id, position)
);

-- Registro de conclusões por usuário (só missões concluídas)
create table if not exists public.user_mission_completions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  group_id        uuid not null references public.contract_groups(id) on delete cascade,
  mission_id      uuid not null references public.contract_group_missions(id) on delete cascade,
  points_credited integer not null default 0,
  completed_at    timestamptz not null default now(),
  unique (user_id, mission_id)
);

-- RLS
alter table public.contract_groups          enable row level security;
alter table public.contract_group_missions  enable row level security;
alter table public.user_mission_completions enable row level security;

create policy "cgroups_select_active" on public.contract_groups
  for select using (active = true and starts_at <= now() and expires_at >= now());

create policy "cgmissions_select" on public.contract_group_missions
  for select using (
    group_id in (
      select id from public.contract_groups
      where active = true and starts_at <= now() and expires_at >= now()
    )
  );

create policy "umc_select_own" on public.user_mission_completions
  for select using (auth.uid() = user_id);

create index if not exists idx_contract_groups_faction on public.contract_groups(faction_id, type);
create index if not exists idx_cgmissions_group on public.contract_group_missions(group_id, position);
create index if not exists idx_umc_user_group on public.user_mission_completions(user_id, group_id);

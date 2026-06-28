-- Sistema de contratos ativos — aditivo, sem DROP.

create table if not exists public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  type                text not null,              -- Principal | Secundário | Diário | Facção
  tier                text not null default 'Básico', -- Básico | Avançado | Épico | Lendário
  title               text not null,
  description         text not null default '',
  story               text not null default '',
  image_url           text,
  objective           text not null default '',   -- texto do objetivo principal
  total               integer not null default 1, -- total para completar
  sucatas             integer not null default 0,
  xp                  integer not null default 0,
  rep                 integer,
  location            text not null default '',
  estimated_time      text not null default '',
  best_time_of_day    text not null default '',
  climate             text not null default '',
  environmental_risk  text not null default 'Médio', -- Baixo | Médio | Alto | Extremo
  expires_at          timestamptz,
  variant             text,                       -- dourada | holografica | corrompida
  bonus_condition     text not null default '',
  bonus_reward        text not null default '',
  rewards             jsonb not null default '[]',    -- [{kind,amount,item_name?,item_image?,item_qty?}]
  objectives          jsonb not null default '[]',    -- [{text,desc,total}]
  enemies             jsonb not null default '[]',    -- [{name,type,dots,color,image}]
  success_rate        integer not null default 50,
  players_completed   integer not null default 0,
  best_record_time    text not null default '',
  best_record_player  text not null default '',
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

-- Aceitações e progresso dos usuários
create table if not exists public.user_contracts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  contract_id  uuid not null references public.contracts(id) on delete cascade,
  progress     integer not null default 0,
  status       text not null default 'active',   -- active | completed | failed | expired
  accepted_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, contract_id)
);

-- RLS
alter table public.contracts     enable row level security;
alter table public.user_contracts enable row level security;

create policy "contracts_select_active" on public.contracts
  for select using (active = true);

create policy "user_contracts_select_own" on public.user_contracts
  for select using (auth.uid() = user_id);

create index if not exists idx_user_contracts_user on public.user_contracts(user_id);
create index if not exists idx_user_contracts_contract on public.user_contracts(contract_id);

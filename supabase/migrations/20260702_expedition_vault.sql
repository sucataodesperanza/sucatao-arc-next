-- Expedições e cofres de expedição.
-- Aditivo: não altera nem remove nada existente.

-- Tabela de expedições (eventos temporários com cofre de itens)
create table if not exists public.expeditions (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       text        not null default 'scheduled'
                           check (status in ('scheduled', 'active', 'ended')),
  slots_per_pack integer   not null default 20,
  created_at   timestamptz not null default now()
);

alter table public.expeditions enable row level security;

create policy "expeditions_select_public" on public.expeditions
  for select using (true);

-- Pacotes de cofre comprados por usuário por expedição.
-- Cada linha acumula os packs; slot total = packs_count × slots_per_pack.
create table if not exists public.expedition_vault_packs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  expedition_id  uuid        not null references public.expeditions(id) on delete cascade,
  packs_count    integer     not null default 0,
  total_slots    integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, expedition_id)
);

alter table public.expedition_vault_packs enable row level security;

create policy "expedition_vault_packs_select_own" on public.expedition_vault_packs
  for select using (auth.uid() = user_id);

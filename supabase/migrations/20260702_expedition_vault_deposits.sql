-- Agendamentos de entrega/retirada de itens do cofre de expedição
create table if not exists public.expedition_vault_deposits (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  expedition_id uuid        not null references public.expeditions(id) on delete cascade,
  type          text        not null check (type in ('deposit', 'pickup')),
  items         jsonb       not null default '[]'::jsonb,
  slots_used    integer     not null default 0,
  preferred_at  timestamptz,
  notes         text,
  status        text        not null default 'scheduled'
                            check (status in ('scheduled', 'in_storage', 'returned', 'cancelled')),
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.expedition_vault_deposits enable row level security;

create policy "evd_select_own"
  on public.expedition_vault_deposits for select
  using (auth.uid() = user_id);

create policy "evd_insert_own"
  on public.expedition_vault_deposits for insert
  with check (auth.uid() = user_id);

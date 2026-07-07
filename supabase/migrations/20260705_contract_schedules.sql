-- Tabela de agendamentos de entrega para o sistema unificado de contratos.
-- Substitui contract_mission_schedules para contratos da tabela contracts.

create table if not exists public.contract_schedules (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  contract_id     uuid        not null references public.contracts(id) on delete cascade,
  objective_index int         not null default 0,
  scheduled_at    timestamptz,
  game_id         text,
  status          text        not null default 'scheduled'
                  check (status in ('scheduled', 'confirmed', 'cancelled')),
  created_at      timestamptz not null default now(),
  unique(user_id, contract_id, objective_index)
);

alter table public.contract_schedules enable row level security;

create policy "users can view own contract schedules"
  on public.contract_schedules for select
  using (auth.uid() = user_id);

-- Agendamentos de entrega das missões de contratos sequenciais.
-- O usuário agenda um slot (mesmo sistema do trades) para cada missão.
-- O admin confirma a entrega e o sistema credita a recompensa automaticamente.

create table if not exists public.contract_mission_schedules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  group_id     uuid not null references public.contract_groups(id) on delete cascade,
  mission_id   uuid not null references public.contract_group_missions(id) on delete cascade,
  scheduled_at timestamptz null,                  -- horário escolhido pelo usuário
  game_id      text null,                          -- ID do jogador para o admin encontrar
  status       text not null default 'pending',   -- 'pending' | 'scheduled' | 'confirmed' | 'expired' | 'cancelled'
  expires_at   timestamptz not null,              -- prazo para agendar (1d/7d/30d após ativação)
  confirmed_at timestamptz null,
  created_at   timestamptz not null default now(),
  unique (user_id, mission_id)
);

alter table public.contract_mission_schedules enable row level security;

create policy "cms_select_own" on public.contract_mission_schedules
  for select using (auth.uid() = user_id);

create index if not exists idx_cms_user       on public.contract_mission_schedules(user_id, status);
create index if not exists idx_cms_scheduled  on public.contract_mission_schedules(scheduled_at) where status = 'scheduled';
create index if not exists idx_cms_expires    on public.contract_mission_schedules(expires_at)   where status = 'pending';

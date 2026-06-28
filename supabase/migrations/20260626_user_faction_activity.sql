-- Atividades por usuário dentro da facção (geradas pelo sistema/admin).
-- Aditivo — sem DROP.

create table if not exists public.user_faction_activity (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  faction_id   uuid not null references public.factions(id) on delete cascade,
  display_name text not null default '',          -- nome exibido na atividade
  text         text not null,                    -- ex: "concluiu o contrato 'Coleta de Sucata'"
  points       integer null,                     -- pontos para a facção (opcional)
  event_type   text not null default 'generic',  -- 'join', 'contract', 'delivery', 'generic'
  created_at   timestamptz not null default now()
);

alter table public.user_faction_activity enable row level security;

-- Usuário vê suas próprias atividades
create policy "ufa_select_own" on public.user_faction_activity
  for select using (auth.uid() = user_id);

-- Todos os membros da mesma facção veem o feed da facção
create policy "ufa_select_faction" on public.user_faction_activity
  for select using (
    faction_id in (
      select faction_id from public.user_factions where user_id = auth.uid()
    )
  );

create index if not exists idx_ufa_faction_id on public.user_faction_activity(faction_id, created_at desc);
create index if not exists idx_ufa_user_id   on public.user_faction_activity(user_id,    created_at desc);

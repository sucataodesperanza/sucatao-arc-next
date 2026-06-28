-- Inscrições para o programa de streamers.
create table if not exists public.streamer_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  nickname     text not null,
  platform     text not null,
  channel_url  text not null,
  message      text not null default '',
  status       text not null default 'pending', -- pending | approved | rejected
  reviewed_by  uuid null references auth.users(id) on delete set null,
  reviewed_at  timestamptz null,
  created_at   timestamptz not null default now()
);

alter table public.streamer_applications enable row level security;

-- Usuário vê apenas suas próprias inscrições
create policy "applications_select_own" on public.streamer_applications
  for select using (auth.uid() = user_id);

-- Usuário só pode inserir se não tiver inscrição pendente ou aprovada
create policy "applications_insert_own" on public.streamer_applications
  for insert with check (auth.uid() = user_id);

create index if not exists idx_streamer_applications_user   on public.streamer_applications(user_id);
create index if not exists idx_streamer_applications_status on public.streamer_applications(status, created_at desc);

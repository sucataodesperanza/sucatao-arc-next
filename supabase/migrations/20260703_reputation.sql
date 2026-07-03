-- Reputação pública dos usuários

-- 1. Coluna reputation na tabela profiles
alter table public.profiles
  add column if not exists reputation        integer not null default 0,
  add column if not exists reputation_streak integer not null default 0,
  add column if not exists last_activity_date date    null;

-- 2. Tabela de histórico de reputação
create table if not exists public.reputation_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     integer not null,
  reason     text    not null,
  source     text    not null check (source in ('trade', 'contract', 'daily_streak', 'admin')),
  ref_id     text    null,
  created_at timestamptz not null default now()
);

-- Índice para consultas por usuário
create index if not exists reputation_history_user_idx on public.reputation_history(user_id, created_at desc);

-- 3. RLS
alter table public.reputation_history enable row level security;

-- Usuário vê apenas o próprio histórico
create policy "rep_hist_select_own"
  on public.reputation_history for select
  using (auth.uid() = user_id);

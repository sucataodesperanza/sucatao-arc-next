-- Slots de agendamento in-game para entregas de trades.
-- Aditivo: não altera nada existente.

create table if not exists public.trade_slots (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,            -- "Sex 20/06 · 15:00"
  scheduled_for  timestamptz not null,     -- data/hora exata
  capacity       integer not null default 1,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists trade_slots_scheduled_idx on public.trade_slots (scheduled_for);
create index if not exists trade_slots_active_idx    on public.trade_slots (active);

alter table public.trade_slots enable row level security;

create policy "trade_slots_select_active" on public.trade_slots
  for select using (active = true);

-- Adiciona colunas de agendamento em trade_acceptances
alter table public.trade_acceptances
  add column if not exists slot_id  uuid null references public.trade_slots(id) on delete set null,
  add column if not exists game_id  text null;

-- Índice para buscar aceitações por slot
create index if not exists trade_acceptances_slot_idx on public.trade_acceptances (slot_id)
  where slot_id is not null;

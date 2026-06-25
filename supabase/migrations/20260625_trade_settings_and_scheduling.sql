-- Configuração de horário de funcionamento dos trades (singleton).
-- Aditivo: não altera nada existente.

create table if not exists public.trade_settings (
  id                      integer primary key default 1 check (id = 1),
  operating_hours_start   text not null default '09:00',
  operating_hours_end     text not null default '00:00',
  slot_duration_minutes   integer not null default 5,
  updated_at              timestamptz not null default now()
);

-- Insere a linha padrão (apenas uma linha possível)
insert into public.trade_settings (id, operating_hours_start, operating_hours_end)
values (1, '09:00', '00:00')
on conflict (id) do nothing;

alter table public.trade_settings enable row level security;

create policy "trade_settings_select_all" on public.trade_settings
  for select using (true);

-- Adiciona campo scheduled_at em trade_acceptances (datetime livre, substitui slot_id)
alter table public.trade_acceptances
  add column if not exists scheduled_at timestamptz null;

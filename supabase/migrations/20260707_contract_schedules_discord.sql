-- Adiciona canal Discord por agendamento de contrato.
alter table public.contract_schedules
  add column if not exists discord_channel_id text;

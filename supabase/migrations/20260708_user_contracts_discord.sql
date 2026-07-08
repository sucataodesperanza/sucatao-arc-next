-- Canal Discord por aceitação de contrato.
alter table public.user_contracts
  add column if not exists discord_channel_id text;

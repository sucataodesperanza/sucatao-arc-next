alter table public.trade_acceptances
  add column if not exists discord_channel_id text null;

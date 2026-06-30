alter table public.orders
  add column if not exists discord_channel_id text null,
  add column if not exists delivered_at timestamptz null;

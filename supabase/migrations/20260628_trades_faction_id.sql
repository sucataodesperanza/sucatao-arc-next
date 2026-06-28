-- Adiciona faction_id na tabela trades (estava faltando na migration de producao).
alter table public.trades
  add column if not exists faction_id uuid null references public.factions(id) on delete set null;

create index if not exists idx_trades_faction on public.trades(faction_id) where faction_id is not null;

-- Rastreamento de progresso por objetivo em user_contracts.
-- {"0": 2, "1": 0} — chave = índice do objetivo (string), valor = quantidade entregue.
alter table public.user_contracts
  add column if not exists objectives_progress jsonb not null default '{}';

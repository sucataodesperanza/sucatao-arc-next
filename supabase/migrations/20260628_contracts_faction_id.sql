-- Vincula contratos a uma facção específica (opcional).
-- Aditivo — sem DROP.

alter table public.contracts
  add column if not exists faction_id uuid null references public.factions(id) on delete set null;

create index if not exists idx_contracts_faction on public.contracts(faction_id)
  where faction_id is not null;

-- Adiciona image_url aos grupos de contratos (para o card de passe).
alter table public.contract_groups
  add column if not exists image_url text null;

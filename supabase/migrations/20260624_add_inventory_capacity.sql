-- Capacidade do inventário: quantidade máxima de tipos de item que o usuário pode ter.
-- Padrão: 100. Expansível em pacotes de +25 slots.

alter table public.profiles
  add column if not exists inventory_capacity integer not null default 100;

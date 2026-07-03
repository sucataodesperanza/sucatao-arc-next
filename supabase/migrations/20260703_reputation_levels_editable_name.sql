-- Permite editar o nome dos níveis de reputação
-- Usa position como identificador estável (0–7) em vez de name

alter table public.reputation_levels
  add constraint reputation_levels_position_key unique (position);

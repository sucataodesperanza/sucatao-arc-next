-- Corrige RLS de contract_groups: passes à venda devem ser visíveis
-- antes de starts_at (vitrine); a restrição de starts_at fica só na lógica da API
-- para missões/progresso.

drop policy if exists "cgroups_select_active" on public.contract_groups;

create policy "cgroups_select_active" on public.contract_groups
  for select using (active = true and expires_at >= now());

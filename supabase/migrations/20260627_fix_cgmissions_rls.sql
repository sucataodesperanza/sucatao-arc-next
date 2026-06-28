-- Corrige RLS de contract_group_missions: remove restrição de starts_at
-- para que missões de contratos com início futuro sejam visíveis.

drop policy if exists "cgmissions_select" on public.contract_group_missions;

create policy "cgmissions_select" on public.contract_group_missions
  for select using (
    group_id in (
      select id from public.contract_groups
      where active = true and expires_at >= now()
    )
  );

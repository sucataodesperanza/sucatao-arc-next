-- Adiciona policy de UPDATE para trade_acceptances.
-- Sem ela, o usuário não consegue agendar (atualizar slot_id/game_id/status).
-- O Supabase silencia o erro mas não persiste a alteração.

create policy "trade_acceptances_update_own" on public.trade_acceptances
  for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

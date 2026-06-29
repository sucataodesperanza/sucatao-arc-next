-- RLS policies para a tabela orders
-- Usuário autenticado pode ler e criar seus próprios pedidos.
-- Service role (admin client) pode fazer tudo sem restrição.

alter table public.orders enable row level security;

drop policy if exists "orders: usuario le seus pedidos"    on public.orders;
drop policy if exists "orders: usuario cria seus pedidos"  on public.orders;
drop policy if exists "orders: service role acesso total"  on public.orders;

create policy "orders: usuario le seus pedidos"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid());

create policy "orders: usuario cria seus pedidos"
  on public.orders for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "orders: service role acesso total"
  on public.orders for all
  to service_role
  using (true)
  with check (true);

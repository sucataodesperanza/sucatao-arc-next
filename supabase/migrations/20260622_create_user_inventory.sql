-- Inventário do jogador: itens adquiridos via compras na loja.
-- Referencia catalog_items para sempre ter dados atualizados.
-- Aditivo: não altera nada existente.

create table if not exists public.user_inventory (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null references public.catalog_items(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists user_inventory_user_idx on public.user_inventory (user_id);
create index if not exists user_inventory_item_idx on public.user_inventory (item_id);

alter table public.user_inventory enable row level security;

-- Usuário vê e gerencia apenas seu próprio inventário
create policy "user_inventory_select_own" on public.user_inventory
  for select using (auth.uid() = user_id);

-- Log de aquisições do inventário: cada entrada registra um evento.
-- Append-only — não é atualizado, apenas inserido.
-- Permite histórico completo mesmo quando user_inventory faz upsert.

create table if not exists public.inventory_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     text not null references public.catalog_items(id) on delete cascade,
  quantity    integer not null default 1,
  source      text not null default 'unknown',
  -- Valores possíveis: points | pix | trade | reconcile | admin
  acquired_at timestamptz not null default now()
);

create index if not exists inventory_history_user_idx on public.inventory_history (user_id, acquired_at desc);

alter table public.inventory_history enable row level security;

create policy "inventory_history_select_own" on public.inventory_history
  for select using (auth.uid() = user_id);

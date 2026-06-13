-- Catálogo de itens do ARC Raiders (sincronizado via MetaForge) e estoque da loja.
-- Aditivo: não altera nem remove nada das tabelas existentes (orders, profiles, coupons, etc.).

create table if not exists public.catalog_items (
  id text primary key,
  name text not null,
  name_en text not null,
  description text null,
  description_en text null,
  item_type text null,
  subcategory text null,
  rarity text null,
  value numeric null,
  weight_kg numeric null,
  stack_size integer null,
  workbench text null,
  icon_url text null,
  is_weapon boolean not null default false,
  is_blueprint boolean not null default false,
  is_craftable boolean not null default false,
  is_recyclable boolean not null default false,
  active boolean not null default true,
  synced_at timestamptz null
);

create index if not exists catalog_items_item_type_idx on public.catalog_items (item_type);
create index if not exists catalog_items_rarity_idx on public.catalog_items (rarity);
create index if not exists catalog_items_active_idx on public.catalog_items (active);

alter table public.catalog_items enable row level security;

create policy "catalog_items_select_active_public" on public.catalog_items
  for select using (active = true);

-- Estoque: 1 linha por item que está à venda (subset de catalog_items).
create table if not exists public.stock_items (
  catalog_item_id text primary key references public.catalog_items(id) on delete cascade,
  value numeric not null default 0,
  quantity integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.stock_items enable row level security;

create policy "stock_items_select_all" on public.stock_items
  for select using (true);

-- Decrementa estoque de vários itens de uma vez, de forma atômica.
-- Se algum item não tiver quantidade suficiente, desfaz tudo (raise exception).
create or replace function public.decrement_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_item_id text;
  v_qty integer;
  v_remaining integer;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := item->>'itemId';
    v_qty := (item->>'quantity')::integer;

    update public.stock_items
      set quantity = quantity - v_qty, updated_at = now()
      where catalog_item_id = v_item_id and quantity >= v_qty
      returning quantity into v_remaining;

    if not found then
      raise exception 'Estoque insuficiente para o item %', v_item_id;
    end if;
  end loop;
end;
$$;

-- Devolve estoque (usado quando um pedido falha/é cancelado após a reserva).
create or replace function public.restore_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items)
  loop
    update public.stock_items
      set quantity = quantity + (item->>'quantity')::integer, updated_at = now()
      where catalog_item_id = item->>'itemId';
  end loop;
end;
$$;

grant execute on function public.decrement_stock(jsonb) to authenticated, service_role;
grant execute on function public.restore_stock(jsonb) to authenticated, service_role;

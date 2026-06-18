-- Liga cada linha do catalog_items ao ID canônico do arc-data.
-- Aditivo: apenas adiciona coluna e índice.

alter table public.catalog_items
  add column if not exists arc_item_id text default null;

create index if not exists catalog_items_arc_item_id_idx
  on public.catalog_items (arc_item_id)
  where arc_item_id is not null;

alter table public.catalog_items
  add column if not exists used_in_crafting text[] default '{}'::text[];

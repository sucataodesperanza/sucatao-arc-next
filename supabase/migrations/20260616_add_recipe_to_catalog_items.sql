alter table public.catalog_items
  add column if not exists recipe jsonb default null;

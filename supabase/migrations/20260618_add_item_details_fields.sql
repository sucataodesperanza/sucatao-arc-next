-- Novos campos de informação para itens (materiais e craftáveis).
-- Aditivo: apenas adiciona colunas, não remove nem altera nada existente.

alter table public.catalog_items
  add column if not exists obtained_from  jsonb default '[]'::jsonb,
  add column if not exists recycled_into  jsonb default '[]'::jsonb,
  add column if not exists recovered_into jsonb default '[]'::jsonb;

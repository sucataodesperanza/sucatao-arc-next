-- Adiciona campos de item de loja diretamente na expedição.
-- Elimina a necessidade de um catalog_item separado.

alter table public.expeditions
  add column if not exists item_name       text,
  add column if not exists item_image_url  text,
  add column if not exists price_points    integer,
  add column if not exists price_cash      numeric(10,2);

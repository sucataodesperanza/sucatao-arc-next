-- Adiciona campos de cupom na tabela orders (aditivo)
alter table public.orders add column if not exists coupon_code     text         null;
alter table public.orders add column if not exists discount_amount numeric(10,2) null;

-- Adiciona colunas de PIX e pagamento na tabela orders (produção)
alter table public.orders
  add column if not exists payment_provider          text,
  add column if not exists payment_reference         text,
  add column if not exists payment_provider_status   text,
  add column if not exists pix_code                  text,
  add column if not exists pix_qr_code_base64        text,
  add column if not exists pix_expires_at            timestamptz,
  add column if not exists paid_at                   timestamptz;

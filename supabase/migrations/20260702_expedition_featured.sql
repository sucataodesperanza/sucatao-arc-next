-- Adiciona toggle de destaque na expedição (exibe item nos Destaques da loja).
alter table public.expeditions
  add column if not exists featured boolean not null default false;

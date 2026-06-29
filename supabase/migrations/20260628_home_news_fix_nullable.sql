-- Remove NOT NULL de colunas opcionais da home_news em producao
alter table public.home_news alter column href       drop not null;
alter table public.home_news alter column image_url  drop not null;
alter table public.home_news alter column date_label drop not null;
alter table public.home_news alter column text       drop not null;
alter table public.home_news alter column icon_name  drop not null;

-- Tabelas para gerenciar o conteúdo da tela inicial (notas e slides)

create table if not exists public.home_news (
  id          uuid primary key default gen_random_uuid(),
  position    integer not null default 0,
  date_label  text,
  title       text not null,
  text        text,
  image_url   text,
  href        text,
  icon_name   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.home_slides (
  id          uuid primary key default gen_random_uuid(),
  position    integer not null default 0,
  tag         text,
  icon_name   text,
  image_url   text,
  title       text not null,
  text        text,
  cta_label   text,
  cta_href    text,
  created_at  timestamptz not null default now()
);

-- Apenas admins (service_role) lêem e escrevem; leitura pública para a home
alter table public.home_news   enable row level security;
alter table public.home_slides enable row level security;

drop policy if exists "home_news: leitura publica"   on public.home_news;
drop policy if exists "home_slides: leitura publica" on public.home_slides;
drop policy if exists "home_news: service role"      on public.home_news;
drop policy if exists "home_slides: service role"    on public.home_slides;

create policy "home_news: leitura publica"
  on public.home_news for select to anon, authenticated using (true);

create policy "home_slides: leitura publica"
  on public.home_slides for select to anon, authenticated using (true);

create policy "home_news: service role"
  on public.home_news for all to service_role using (true) with check (true);

create policy "home_slides: service role"
  on public.home_slides for all to service_role using (true) with check (true);

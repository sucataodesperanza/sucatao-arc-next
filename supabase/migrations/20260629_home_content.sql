-- Conteúdo dinâmico da tela inicial — aditivo, sem DROP.

-- Notas de atualização (newsItems)
create table if not exists public.home_news (
  id         uuid primary key default gen_random_uuid(),
  date_label text not null default '',       -- ex: "11 DE JUNHO DE 2026"
  title      text not null,
  text       text not null default '',
  image_url  text null,
  href       text null,                      -- link do card (opcional)
  icon_name  text not null default 'Megaphone', -- nome do ícone Lucide
  active     boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- Slides de novidades (heroSlides)
create table if not exists public.home_slides (
  id         uuid primary key default gen_random_uuid(),
  tag        text not null default '',       -- ex: "Atualizações da Loja"
  icon_name  text not null default 'Sparkles',
  image_url  text null,
  title      text not null,
  text       text not null default '',
  cta_label  text not null default 'Saiba mais',
  cta_href   text not null default '/',
  active     boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- RLS: leitura pública
alter table public.home_news   enable row level security;
alter table public.home_slides enable row level security;

create policy "home_news_select"   on public.home_news   for select using (active = true);
create policy "home_slides_select" on public.home_slides for select using (active = true);

-- Storage bucket para imagens da home
insert into storage.buckets (id, name, public)
values ('home-assets', 'home-assets', true)
on conflict (id) do nothing;

create policy "home_assets_select" on storage.objects
  for select using (bucket_id = 'home-assets');

-- Seed: notas de atualização atuais
insert into public.home_news (date_label, title, text, image_url, href, icon_name, position) values
  ('11 DE JUNHO DE 2026', 'Reposição de Estoque Concluída',
   'Novos itens raros chegaram ao catálogo. Confira os preços atualizados de troca e recompensas.',
   '/assets/bots/arc_bastion.png', null, 'Megaphone', 1),
  ('08 DE JUNHO DE 2026', 'Ranking de Recicladores',
   'Veja quem mais reciclou componentes essa semana e dispute o topo do ranking da comunidade.',
   '/assets/bots/arc_rocketeer.png', '/rankings', 'TrendingUp', 2)
on conflict do nothing;

-- Seed: slides de novidades atuais
insert into public.home_slides (tag, icon_name, image_url, title, text, cta_label, cta_href, position) values
  ('Atualizações da Loja', 'Sparkles', '/assets/bots/arc_matriarch.png',
   'O Sucatão Tem Tudo Que Você Precisa',
   'Itens, componentes e equipamentos para sua jornada na Superfície. Compre, troque e recicle direto pelo catálogo.',
   'Ver catálogo', '/loja', 1),
  ('Marketplace', 'ArrowLeftRight', '/assets/bots/arc_sentinel.png',
   'Troque Itens Com Outros Raiders',
   'Compre e venda equipamentos raros no marketplace. Novas ofertas todos os dias da comunidade.',
   'Ver trades', '/trades', 2),
  ('Facções', 'Flag', '/assets/bots/arc_the_queen.png',
   'Escolha Sua Facção e Domine',
   'Junte-se a uma das 5 facções e dispute o topo dos rankings. Recompensas exclusivas para os melhores.',
   'Ver facções', '/faccoes', 3),
  ('Contratos', 'ScrollText', '/assets/bots/arc_leaper.png',
   'Complete Contratos e Ganhe Recompensas',
   'Missões diárias e semanais com Sucatas, XP e itens exclusivos. Acumule reputação e suba no ranking.',
   'Ver contratos', '/contratos', 4)
on conflict do nothing;

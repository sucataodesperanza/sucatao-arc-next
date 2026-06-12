-- Loot boxes (mesma estrutura já usada em produção pelo sucataodesperanza).
-- Aditivo e idempotente: pode ser rodado em produção sem efeito (tabela/policies já existem).

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.loot_boxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null check (price > 0),
  image_url text not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary')),
  description text not null,
  possible_rewards text[] not null default '{}',
  drop_rates jsonb not null,
  times_opened integer not null default 0 check (times_opened >= 0),
  total_revenue numeric(12, 2) not null default 0 check (total_revenue >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists loot_boxes_status_idx
  on public.loot_boxes (status);

create index if not exists loot_boxes_price_idx
  on public.loot_boxes (price);

drop trigger if exists loot_boxes_touch_updated_at on public.loot_boxes;
create trigger loot_boxes_touch_updated_at
before update on public.loot_boxes
for each row
execute function public.touch_updated_at();

-- Seed apenas se a tabela estiver vazia (não afeta produção, que já tem dados).
insert into public.loot_boxes (
  name, price, image_url, rarity, description, possible_rewards, drop_rates, times_opened, total_revenue, status
)
select *
from (
  values
    (
      'Caixa de Iniciante',
      49.90,
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=500&fit=crop',
      'common',
      'Contem 5 itens aleatorios! Uma caixa basica com itens iniciais. Perfeita para comecar sua jornada!',
      array['Municao de Plasma', 'Kit Medico Basico', 'Granada Fumigena', 'Armadura Leve', 'E muito mais...'],
      '{"common":70,"rare":25,"epic":4,"legendary":1}'::jsonb,
      0, 0, 'active'
    ),
    (
      'Caixa de Combate',
      149.90,
      'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500&h=500&fit=crop',
      'rare',
      'Contem 5 itens aleatorios! Caixa repleta de equipamentos de combate. Chances garantidas de itens raros!',
      array['Pulse Rifle X-9', 'Escudo Cinetico', 'Granada EMP', 'Capacete HUD', 'Boost Pack', 'E muito mais...'],
      '{"common":40,"rare":45,"epic":13,"legendary":2}'::jsonb,
      0, 0, 'active'
    ),
    (
      'Caixa Tatica Elite',
      299.90,
      'https://images.unsplash.com/photo-1606161290889-77950cfb67d3?w=500&h=500&fit=crop',
      'epic',
      'Contem 5 itens aleatorios! Equipamentos taticos avancados. Alta chance de itens epicos e lendarios!',
      array['Armadura Titan MK-III', 'Sniper Quantica', 'Drone de Suporte', 'Nano Med-Kit', 'E muito mais...'],
      '{"common":20,"rare":40,"epic":30,"legendary":10}'::jsonb,
      0, 0, 'active'
    ),
    (
      'Caixa Lendaria',
      599.90,
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=500&fit=crop',
      'legendary',
      'Contem 5 itens aleatorios! A caixa mais rara! Chance garantida de itens lendarios e artefatos unicos!',
      array['Reliquia Alienigena', 'Espada de Plasma', 'Sniper Quantica', 'Armadura Titan MK-III', 'E muito mais...'],
      '{"common":5,"rare":25,"epic":40,"legendary":30}'::jsonb,
      0, 0, 'active'
    )
) as seed(
  name, price, image_url, rarity, description, possible_rewards, drop_rates, times_opened, total_revenue, status
)
where not exists (
  select 1 from public.loot_boxes
);

alter table public.loot_boxes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loot_boxes'
      and policyname = 'loot_boxes_select_public'
  ) then
    create policy loot_boxes_select_public
      on public.loot_boxes
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loot_boxes'
      and policyname = 'loot_boxes_insert_admin_only'
  ) then
    create policy loot_boxes_insert_admin_only
      on public.loot_boxes
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loot_boxes'
      and policyname = 'loot_boxes_update_admin_only'
  ) then
    create policy loot_boxes_update_admin_only
      on public.loot_boxes
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'loot_boxes'
      and policyname = 'loot_boxes_delete_admin_only'
  ) then
    create policy loot_boxes_delete_admin_only
      on public.loot_boxes
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
      );
  end if;
end
$$;

-- Unifica o sistema de passes (contract_groups) com contratos regulares.
-- Adiciona contract_type, mission_type e price ao contracts.
-- Migra dados de contract_groups → contracts e compras → user_contracts.

-- 1. Novas colunas em contracts
alter table public.contracts
  add column if not exists contract_type text not null default 'comum',
  add column if not exists mission_type  text not null default 'diario',
  add column if not exists price_points  int  not null default 0,
  add column if not exists price_real    numeric(10,2) not null default 0;

-- 2. Backfill a partir do campo type legado
update public.contracts set
  contract_type = case
    when type = 'Facção' then 'faccao'
    else 'comum'
  end,
  mission_type = 'diario'
where contract_type = 'comum' and mission_type = 'diario';

-- 3. Migrar contract_groups → contracts
insert into public.contracts (
  id, title, description, image_url, faction_id, active,
  contract_type, mission_type, price_points, price_real,
  sucatas, xp, rep,
  type, tier, environmental_risk,
  objective, total, story,
  location, estimated_time, best_time_of_day, climate,
  bonus_condition, bonus_reward, success_rate, variant,
  rewards, objectives, enemies,
  created_at
)
select
  cg.id,
  cg.title,
  coalesce(cg.description, ''),
  cg.image_url,
  cg.faction_id,
  coalesce(cg.active, true),
  case when cg.faction_id is not null then 'faccao' else 'comum' end,
  case cg.type
    when 'daily'   then 'diario'
    when 'weekly'  then 'semanal'
    when 'monthly' then 'mensal'
    else 'diario'
  end,
  coalesce(cg.price_points, 0),
  coalesce(cg.price_real, 0)::numeric(10,2),
  0, 0, null,
  'Principal', 'Básico', 'Médio',
  coalesce(cg.description, cg.title), -- objective = descrição do grupo
  case cg.type when 'daily' then 1 when 'weekly' then 7 else 30 end,
  '',
  '', '', '', '',
  '', '', 50, null,
  '[]'::jsonb,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'text', m.title,
          'desc', coalesce(m.description, ''),
          'total', coalesce(m.total, 1)
        ) order by m.position
      )
      from public.contract_group_missions m
      where m.group_id = cg.id
    ),
    '[]'::jsonb
  ),
  '[]'::jsonb,
  coalesce(cg.created_at, now())
from public.contract_groups cg
where not exists (
  select 1 from public.contracts c where c.id = cg.id
);

-- 4. Migrar compras de passes → user_contracts
insert into public.user_contracts (
  user_id, contract_id, status, progress, objectives_progress, accepted_at
)
select
  p.user_id,
  p.group_id,
  case
    when (
      select count(*) from public.user_mission_completions umc
      where umc.user_id = p.user_id and umc.group_id = p.group_id
    ) >= (
      select count(*) from public.contract_group_missions m where m.group_id = p.group_id
    ) and (
      select count(*) from public.contract_group_missions m where m.group_id = p.group_id
    ) > 0
    then 'completed'
    else 'active'
  end,
  (
    select count(*) from public.user_mission_completions umc
    where umc.user_id = p.user_id and umc.group_id = p.group_id
  )::int,
  coalesce(
    (
      select jsonb_object_agg(sub.m_idx::text, case when umc.mission_id is not null then 1 else 0 end)
      from (
        select m.id, (row_number() over (order by m.position) - 1) as m_idx
        from public.contract_group_missions m
        where m.group_id = p.group_id
      ) sub
      left join public.user_mission_completions umc
        on umc.mission_id = sub.id
        and umc.user_id = p.user_id
        and umc.group_id = p.group_id
    ),
    '{}'::jsonb
  ),
  coalesce(p.purchased_at, now())
from public.user_contract_group_purchases p
where not exists (
  select 1 from public.user_contracts uc
  where uc.user_id = p.user_id and uc.contract_id = p.group_id
);

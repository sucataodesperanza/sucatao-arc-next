-- Bônus de lançamento: 25.000 pontos para quem se cadastrar nas primeiras 24h.
-- EDITE a constante launch_at antes de rodar em produção.

create or replace function public.apply_launch_bonus()
returns trigger language plpgsql as $$
declare
  launch_at  timestamptz := '2026-07-01 00:00:00-03'::timestamptz; -- ← EDITE AQUI
  bonus_pts  integer     := 25000;
begin
  if now() between launch_at and launch_at + interval '24 hours' then
    new.points := coalesce(new.points, 0) + bonus_pts;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_launch_bonus on public.profiles;
create trigger trg_launch_bonus
  before insert on public.profiles
  for each row execute function public.apply_launch_bonus();

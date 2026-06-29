-- Bônus de lançamento para usuários já cadastrados: +25.000 pontos.
-- Usuários novos recebem via trigger (20260701_launch_bonus.sql).
-- Idempotente: a coluna source_id guarda 'launch_bonus_2026' —
-- se rodar duas vezes, o profiles.points será somado de novo,
-- então rode UMA VEZ APENAS em produção.

do $$
declare
  bonus_pts  integer := 25000;
  note_text  text    := 'Bônus de lançamento — obrigado por fazer parte do Sucatão desde o início!';
begin

  -- 1. Credita pontos em todos os perfis existentes
  update public.profiles
  set    points = coalesce(points, 0) + bonus_pts
  where  id in (select id from auth.users);

  -- 2. Registra no log de economia (aparece em "Movimentações" no perfil)
  insert into public.economy_logs
    (player_id, action, value, currency, source, source_id, metadata, item_qty)
  select
    p.id,
    'reward',
    bonus_pts,
    'points',
    'admin',
    'launch_bonus_2026',
    jsonb_build_object('reason', note_text),
    1
  from public.profiles p
  where p.id in (select id from auth.users)
    -- Evita duplicar se já existir entrada com esse source_id para o usuário
    and not exists (
      select 1 from public.economy_logs el
      where  el.player_id = p.id
        and  el.source_id = 'launch_bonus_2026'
    );

end $$;

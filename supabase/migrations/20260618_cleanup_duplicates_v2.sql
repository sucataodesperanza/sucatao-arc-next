-- Versão corrigida: usa ROW_NUMBER para garantir que só UMA linha
-- por (name, item_type) sobreviva, independente do formato do ID.
-- Mantém a linha com o ID menor em ordem alfabética (critério consistente).
-- Idempotente.

delete from public.catalog_items
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by lower(name), item_type
        order by id  -- mantém o ID "menor" alfabeticamente
      ) as rn
    from public.catalog_items
  ) sub
  where rn > 1
);

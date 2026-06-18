-- Remove duplicatas de catalog_items, preservando SEMPRE o ID que stock_items referencia.
-- Se nenhuma das duplicatas está no estoque, mantém o menor ID alfabeticamente.

delete from public.catalog_items
where id in (
  select id from (
    select
      id,
      -- Stock items têm prioridade máxima: row_number 1 para quem está no estoque
      row_number() over (
        partition by lower(name)
        order by
          case when id in (select catalog_item_id from public.stock_items) then 0 else 1 end,
          id  -- desempate: menor ID alfabeticamente
      ) as rn
    from public.catalog_items
  ) sub
  where rn > 1
);

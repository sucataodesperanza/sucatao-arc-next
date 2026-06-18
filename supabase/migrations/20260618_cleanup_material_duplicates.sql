-- Remove linhas de material inseridas pelo sync-materials (IDs do arc-data em snake_case)
-- quando já existe outra linha com o mesmo nome (vinda do MetaForge).
-- Mantém sempre a linha com o ID mais CURTO como desempate (MetaForge IDs tendem a ser menores).
-- Idempotente: se não houver duplicatas, não faz nada.

delete from public.catalog_items
where item_type in (
  'Raw Material','Topside Material','Refined Material',
  'Material','Basic Material','Advanced Material','Nature'
)
and id in (
  -- Para cada par de linhas com mesmo nome, mantém a de ID menor (length) e deleta a outra
  select a.id
  from public.catalog_items a
  join public.catalog_items b
    on  b.name = a.name
    and b.id   != a.id
    and b.item_type = a.item_type
  where length(a.id) > length(b.id)
    -- Se tamanhos iguais, deleta o que vier depois em ordem alfabética
     or (length(a.id) = length(b.id) and a.id > b.id)
);

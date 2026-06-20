-- Bucket público para imagens dos itens de recompensa (admin faz upload).
-- Aditivo e idempotente.

insert into storage.buckets (id, name, public)
values ('reward-images', 'reward-images', true)
on conflict (id) do nothing;

-- Leitura pública
drop policy if exists "Reward images are publicly accessible" on storage.objects;
create policy "Reward images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'reward-images');

-- Upload e update: somente usuários admin
drop policy if exists "Admins can upload reward images" on storage.objects;
create policy "Admins can upload reward images"
  on storage.objects for insert
  with check (
    bucket_id = 'reward-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Admins can update reward images" on storage.objects;
create policy "Admins can update reward images"
  on storage.objects for update
  using (
    bucket_id = 'reward-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

drop policy if exists "Admins can delete reward images" on storage.objects;
create policy "Admins can delete reward images"
  on storage.objects for delete
  using (
    bucket_id = 'reward-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

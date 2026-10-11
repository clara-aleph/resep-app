-- Jalankan di Supabase Dashboard → SQL Editor.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  cover_image_url text,
  original_cover_image_url text,
  source_image_url text,
  result_image_url text,
  extracted_text text,
  ingredients_list jsonb not null default '[]'::jsonb,
  instructions_list jsonb not null default '[]'::jsonb,
  categories text[] not null default '{}',
  is_tried boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Aman dijalankan untuk proyek yang sudah memakai schema versi sebelumnya.
alter table public.recipes add column if not exists source_image_url text;
alter table public.recipes add column if not exists original_cover_image_url text;
alter table public.recipes add column if not exists result_image_url text;
alter table public.recipes add column if not exists is_tried boolean not null default false;

-- Simpan sampul pertama sebagai cadangan. Foto hasil masakan dapat dipakai sementara
-- sebagai sampul tanpa menghilangkan thumbnail video atau foto resep asal.
update public.recipes
set original_cover_image_url = coalesce(source_image_url, cover_image_url)
where original_cover_image_url is null
  and cover_image_url is not null
  and (result_image_url is null or cover_image_url is distinct from result_image_url);

-- Cache terjemahan tampilan. Resep asli tetap disimpan dalam bahasa Indonesia.
create table if not exists public.recipe_translations (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  locale text not null check (locale in ('en', 'nl', 'zh', 'ja')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, locale)
);

alter table public.recipes enable row level security;

-- Kebijakan awal untuk aplikasi pribadi. Ganti dengan kebijakan berbasis pengguna sebelum produksi.
drop policy if exists "Resep dapat dibaca" on public.recipes;
drop policy if exists "Resep dapat dibuat" on public.recipes;
drop policy if exists "Resep dapat diperbarui" on public.recipes;
drop policy if exists "Resep dapat dihapus" on public.recipes;
create policy "Resep dapat dibaca" on public.recipes for select using (true);
create policy "Resep dapat dibuat" on public.recipes for insert with check (true);
create policy "Resep dapat diperbarui" on public.recipes for update using (true) with check (true);
create policy "Resep dapat dihapus" on public.recipes for delete using (true);

alter table public.recipe_translations enable row level security;
-- Tidak ada kebijakan publik: hanya route serverless dengan service-role key yang boleh
-- membaca atau menulis cache ini.

-- Cache selalu dibuang secara atomik bila konten resep inti berubah.
create or replace function public.clear_recipe_translation_cache()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.title is distinct from new.title
    or old.ingredients_list is distinct from new.ingredients_list
    or old.instructions_list is distinct from new.instructions_list then
    delete from public.recipe_translations where recipe_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists clear_recipe_translation_cache_on_update on public.recipes;
create trigger clear_recipe_translation_cache_on_update
after update of title, ingredients_list, instructions_list on public.recipes
for each row execute function public.clear_recipe_translation_cache();

-- Penyimpanan foto resep asli dan hasil masakan. Jika upload dari browser gagal karena RLS,
-- jalankan kebijakan INSERT/SELECT/DELETE di bawah ini pada proyek Supabase yang dideploy.
insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('recipe-covers', 'recipe-covers', true) on conflict (id) do update set public = true;
drop policy if exists "Foto resep dapat diunggah" on storage.objects;
drop policy if exists "Foto resep dapat dibaca" on storage.objects;
drop policy if exists "Foto resep dapat dihapus" on storage.objects;
create policy "Foto resep dapat diunggah" on storage.objects for insert with check (bucket_id = 'recipe-images');
create policy "Foto resep dapat dibaca" on storage.objects for select using (bucket_id = 'recipe-images');
create policy "Foto resep dapat dihapus" on storage.objects for delete using (bucket_id = 'recipe-images');

drop policy if exists "Sampul resep dapat dibaca" on storage.objects;
create policy "Sampul resep dapat dibaca" on storage.objects for select using (bucket_id = 'recipe-covers');

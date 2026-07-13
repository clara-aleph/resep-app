-- Jalankan di Supabase Dashboard → SQL Editor.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  cover_image_url text,
  source_image_url text,
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
alter table public.recipes add column if not exists is_tried boolean not null default false;

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

-- Penyimpanan foto resep asli. Berkas ini bersifat publik agar bisa ditampilkan di aplikasi.
insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true) on conflict (id) do update set public = true;
drop policy if exists "Foto resep dapat diunggah" on storage.objects;
drop policy if exists "Foto resep dapat dibaca" on storage.objects;
create policy "Foto resep dapat diunggah" on storage.objects for insert with check (bucket_id = 'recipe-images');
create policy "Foto resep dapat dibaca" on storage.objects for select using (bucket_id = 'recipe-images');

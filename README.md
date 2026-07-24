# Koleksi Resepku

Aplikasi Next.js, Tailwind CSS, dan Supabase untuk menyimpan resep dari video maupun foto catatan.

## Menjalankan aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Menghubungkan Supabase gratis

1. Buat proyek gratis di [Supabase](https://supabase.com/dashboard/projects).
2. Buka **Project Settings → API**, lalu salin Project URL dan publishable key (atau anon key lama).
3. Salin `.env.example` menjadi `.env.local`, lalu isi kedua nilainya.
4. Buka **SQL Editor** di Supabase, tempel dan jalankan isi `supabase/schema.sql`.

Tanpa kredensial Supabase, aplikasi memakai penyimpanan lokal browser agar alur UI tetap dapat dicoba. Setelah kredensial diisi, data resep disimpan di tabel Supabase `recipes`.

## Catatan fitur

- Tautan YouTube publik diteruskan oleh route serverless sebagai konteks video langsung ke Gemini 2.5 Flash. Tambahkan `GEMINI_API_KEY` dari Google AI Studio ke `.env.local`; kunci ini tidak pernah dikirim ke browser. Video harus publik (bukan privat atau tidak publik).
- Foto catatan resep dikompres di browser sebelum dikirim ke route serverless Gemini 2.5 Flash. Gemini membaca tulisan tangan Indonesia, termasuk singkatan memasak dan tanda petik pengulangan; hasilnya tetap perlu ditinjau sebelum disimpan.
- Pratinjau video tanpa kunci Gemini ditandai sebagai data contoh pada pengalaman pengguna.

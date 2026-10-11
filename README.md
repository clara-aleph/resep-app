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
- Tambahkan `SUPABASE_SERVICE_ROLE_KEY` hanya pada lingkungan server (misalnya Vercel) agar thumbnail video eksternal dapat disalin ke bucket `recipe-covers` dan tidak kedaluwarsa. Jangan pernah memakai awalan `NEXT_PUBLIC_` untuk kunci ini.
- Thumbnail video kini disalin oleh server ke bucket publik `recipe-covers`, sehingga URL CDN sementara dari YouTube, Meta, atau TikTok tidak pernah disimpan sebagai sampul resep. Jalankan kembali `supabase/schema.sql` agar bucket tersebut dibuat sebelum deploy.
- Terjemahan tampilan menggunakan library Google Translate tanpa kunci API, bukan Gemini. Setelah menjalankan pembaruan, jalankan kembali seluruh `supabase/schema.sql`; tabel cache `recipe_translations` dan trigger-nya menyimpan terjemahan per resep/bahasa lalu membuangnya otomatis saat isi resep diedit. `SUPABASE_SERVICE_ROLE_KEY` diperlukan agar route serverless dapat mengakses cache tersebut secara privat.
- Foto catatan resep dikompres di browser sebelum dikirim ke route serverless Gemini 2.5 Flash. Gemini membaca tulisan tangan Indonesia, termasuk singkatan memasak dan tanda petik pengulangan; hasilnya tetap perlu ditinjau sebelum disimpan.
- Pratinjau video tanpa kunci Gemini ditandai sebagai data contoh pada pengalaman pengguna.

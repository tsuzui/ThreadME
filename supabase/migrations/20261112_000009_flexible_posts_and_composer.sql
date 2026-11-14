begin;

alter table public.content_posts add column if not exists context text;

-- 2. Lepas constraint unik tanggal agar pengguna bebas membuat lebih dari 1 postingan per hari
alter table public.content_posts drop constraint if exists content_posts_scheduled_date_key;

-- 3. Buat scheduled_date dan scheduled_for nullable untuk draf bebas (tanpa jadwal kaku)
alter table public.content_posts alter column scheduled_date drop not null;
alter table public.content_posts alter column scheduled_for drop not null;

-- 4. Tambahkan indeks performa untuk pencarian jadwal aktif oleh worker
create index if not exists content_posts_worker_due_idx
  on public.content_posts(scheduled_date, status, scheduled_for)
  where scheduled_date is not null;

commit;

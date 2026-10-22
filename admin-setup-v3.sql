-- ============================================================
-- Vade Reviews — run this in Supabase SQL Editor (v3)
-- Self-hosted star reviews (1–5) + comments.
-- Signed-in users post; staff moderate from Admin → Store → Reviews.
-- ============================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null,
  product_slug text,
  rating int not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 600),
  status text not null default 'published'
    check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

-- one review per user per product ('' = general / whole-site review)
create unique index if not exists reviews_one_per_product
  on public.reviews (author_id, coalesce(product_slug, ''));

create index if not exists idx_reviews_feed
  on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Published reviews are public; staff+ and the author can also see hidden ones
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read"
  on public.reviews for select
  using (
    status = 'published'
    or auth.uid() = author_id
    or public.app_role() in ('staff', 'co_owner', 'owner')
  );

-- Signed-in users post their own review, always as published
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own"
  on public.reviews for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'published'
    and rating between 1 and 5
  );

-- Staff+ moderate (hide / restore)
drop policy if exists "reviews update staff" on public.reviews;
create policy "reviews update staff"
  on public.reviews for update
  using (public.app_role() in ('staff', 'co_owner', 'owner'))
  with check (public.app_role() in ('staff', 'co_owner', 'owner'));

-- Authors can withdraw their own review; staff+ can delete any
drop policy if exists "reviews delete" on public.reviews;
create policy "reviews delete"
  on public.reviews for delete
  using (
    auth.uid() = author_id
    or public.app_role() in ('staff', 'co_owner', 'owner')
  );

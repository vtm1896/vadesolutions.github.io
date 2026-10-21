-- ============================================================
-- Vade Admin / Role System — run this in Supabase SQL Editor
-- ============================================================

-- 1. Add role column to profiles (customer | staff | co_owner | owner)
alter table public.profiles
  add column if not exists role text not null default 'customer'
  check (role in ('customer', 'staff', 'co_owner', 'owner'));

-- 2. Helper: current user's role (security definer so RLS can use it)
create or replace function public.app_role()
returns text
language sql
security definer
stable
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'customer'
  );
$$;

-- 3. Products table (drives status page)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  game text not null,
  status text not null default 'online'
    check (status in ('online', 'offline', 'updating')),
  description text default '',
  sort_order int not null default 0,
  updated_at timestamptz default now()
);

-- 4. Changelog / patch notes table
create table if not exists public.product_changelog (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  version text not null,
  title text default '',
  entry_date text not null,
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

create index if not exists idx_changelog_slug
  on public.product_changelog (product_slug, created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.products enable row level security;
alter table public.product_changelog enable row level security;
alter table public.profiles enable row level security;

-- Products: everyone reads, staff+ write
drop policy if exists "products readable" on public.products;
create policy "products readable"
  on public.products for select
  using (true);

drop policy if exists "products writable staff" on public.products;
create policy "products writable staff"
  on public.products for update
  using (public.app_role() in ('staff', 'co_owner', 'owner'))
  with check (public.app_role() in ('staff', 'co_owner', 'owner'));

drop policy if exists "products insert staff" on public.products;
create policy "products insert staff"
  on public.products for insert
  with check (public.app_role() in ('staff', 'co_owner', 'owner'));

-- Changelog: everyone reads, staff+ write
drop policy if exists "changelog readable" on public.product_changelog;
create policy "changelog readable"
  on public.product_changelog for select
  using (true);

drop policy if exists "changelog writable staff" on public.product_changelog;
create policy "changelog writable staff"
  on public.product_changelog for update
  using (public.app_role() in ('staff', 'co_owner', 'owner'))
  with check (public.app_role() in ('staff', 'co_owner', 'owner'));

drop policy if exists "changelog insert staff" on public.product_changelog;
create policy "changelog insert staff"
  on public.product_changelog for insert
  with check (public.app_role() in ('staff', 'co_owner', 'owner'));

drop policy if exists "changelog delete staff" on public.product_changelog;
create policy "changelog delete staff"
  on public.product_changelog for delete
  using (public.app_role() in ('staff', 'co_owner', 'owner'));

-- Profiles: users read own; staff+ read all; co_owner+ can update role
-- (owner can only be set manually via SQL)
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own"
  on public.profiles for select
  using (auth.uid() = id or public.app_role() in ('staff', 'co_owner', 'owner'));

drop policy if exists "profiles update role co_owner" on public.profiles;
create policy "profiles update role co_owner"
  on public.profiles for update
  using (public.app_role() in ('co_owner', 'owner'))
  with check (
    public.app_role() = 'owner'
    or (public.app_role() = 'co_owner' and role in ('customer', 'staff', 'co_owner'))
  );

-- ============================================================
-- Seed products (matches current site)
-- ============================================================
insert into public.products (slug, name, game, status, description, sort_order)
values
  ('rust-internal', 'Rust Internal',  'rust',   'online',  'Currently available and undetected', 1),
  ('rust-external', 'Rust External',  'rust',   'offline', 'Currently unavailable for maintenance', 2),
  ('roblox-exec',   'Vade Executor',  'roblox', 'online',  'Currently available and undetected', 3),
  ('roblox-ext',    'Roblox External','roblox', 'online',  'Currently available and undetected', 4)
on conflict (slug) do nothing;

-- ============================================================
-- Seed sample changelog entries (replace with your real notes)
-- items format: [{ "type": "added|fixed|changed|removed", "text": "..." }]
-- ============================================================
insert into public.product_changelog (product_slug, version, title, entry_date, items, created_at)
values
-- Rust Internal
('rust-internal', 'v2.4.1', 'Stability pass', 'Oct 18, 2026', '[
  {"type":"fixed","text":"Fixed rare crash when injecting during loading screens."},
  {"type":"fixed","text":"Resolved menu flicker on 1440p ultrawide monitors."},
  {"type":"changed","text":"Reduced idle memory usage by ~35MB."}
]'::jsonb, now() - interval '3 days'),
('rust-internal', 'v2.4.0', 'Rust update support + new visuals', 'Oct 09, 2026', '[
  {"type":"added","text":"Full support for the latest Rust client update."},
  {"type":"added","text":"New player ESP glow styles (outline, soft, neon)."},
  {"type":"changed","text":"Rebuilt config system — configs now save per-server."},
  {"type":"removed","text":"Dropped legacy skin changer (replaced by new one)."}
]'::jsonb, now() - interval '12 days'),
('rust-internal', 'v2.3.6', 'Detection hardening', 'Sep 27, 2026', '[
  {"type":"changed","text":"Updated driver-level evasion after recent anti-cheat wave."},
  {"type":"fixed","text":"Fixed keybind conflict with Steam overlay."}
]'::jsonb, now() - interval '24 days'),
-- Rust External
('rust-external', 'v1.9.3', 'Maintenance update', 'Oct 20, 2026', '[
  {"type":"changed","text":"Temporarily offline for maintenance — expect return within 24h."},
  {"type":"fixed","text":"Patch in progress for latest game build compatibility."}
]'::jsonb, now() - interval '1 day'),
('rust-external', 'v1.9.2', 'Aimbot rework', 'Oct 02, 2026', '[
  {"type":"changed","text":"Reworked aim smoothing — more natural tracking at all FOVs."},
  {"type":"added","text":"Per-weapon aimbot profiles with auto-switch."},
  {"type":"fixed","text":"Fixed off-by-one on bone selection for vehicles."}
]'::jsonb, now() - interval '19 days'),
-- Vade Executor
('roblox-exec', 'v4.1.0', 'Level 8 unlock + speed', 'Oct 16, 2026', '[
  {"type":"added","text":"Level 8 support with script hub integration."},
  {"type":"changed","text":"New bytecode compiler — ~2x faster script injection."},
  {"type":"fixed","text":"Fixed executor UI lag on low-end machines."}
]'::jsonb, now() - interval '5 days'),
('roblox-exec', 'v4.0.4', 'Stability & fixes', 'Oct 05, 2026', '[
  {"type":"fixed","text":"Fixed random disconnect after extended session."},
  {"type":"fixed","text":"Fixed auto-attach failing on some Microsoft Store installs."},
  {"type":"changed","text":"Improved error reporting for failed script loads."}
]'::jsonb, now() - interval '16 days'),
-- Roblox External
('roblox-ext', 'v3.2.2', 'Universal ESP polish', 'Oct 12, 2026', '[
  {"type":"changed","text":"ESP now works across all games without per-game configs."},
  {"type":"fixed","text":"Fixed wallhack depth buffer on Vulkan-rendered games."},
  {"type":"added","text":"Tracer lines with distance-based fade."}
]'::jsonb, now() - interval '9 days'),
('roblox-ext', 'v3.2.1', 'Performance patch', 'Sep 30, 2026', '[
  {"type":"changed","text":"Dropped CPU usage by ~40% while ESP is active."},
  {"type":"fixed","text":"Fixed overlay flicker on dual-monitor setups."}
]'::jsonb, now() - interval '21 days')
on conflict do nothing;

-- ============================================================
-- OPTIONAL: promote yourself to owner (replace with your user id)
-- Find your id: select id, username from profiles;
-- ============================================================
-- update public.profiles set role = 'owner' where id = 'YOUR-USER-UUID';

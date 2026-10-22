-- ============================================================
-- Vade Admin v2 — prices, maintenance scheduler, orders,
-- coupons, licenses (KeyAuth), audit log, auto-revert
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================

-- ── 1) Products: price plans + maintenance window ───────────
alter table public.products add column if not exists prices jsonb;
alter table public.products add column if not exists maintenance_until timestamptz;
alter table public.products add column if not exists updated_at timestamptz default now();

update public.products set prices = '[
 {"name":"3 Days","desc":"Short-term access","price":15,"link":"YOUR_SELLAUTH_3DAY_LINK"},
 {"name":"7 Days","desc":"Weekly access","price":35,"link":"YOUR_SELLAUTH_WEEK_LINK"},
 {"name":"30 Days","desc":"Monthly access","price":70,"link":"YOUR_SELLAUTH_MONTH_LINK"},
 {"name":"Lifetime","desc":"One-time purchase","price":350,"link":"YOUR_SELLAUTH_LIFETIME_LINK"}
]'::jsonb where slug = 'rust-internal' and prices is null;

update public.products set prices = '[
 {"name":"3 Days","desc":"Short-term access","price":10,"link":"YOUR_SELLAUTH_3DAY_LINK"},
 {"name":"7 Days","desc":"Weekly access","price":25,"link":"YOUR_SELLAUTH_WEEK_LINK"},
 {"name":"30 Days","desc":"Monthly access","price":50,"link":"YOUR_SELLAUTH_MONTH_LINK"},
 {"name":"Lifetime","desc":"One-time purchase","price":250,"link":"YOUR_SELLAUTH_LIFETIME_LINK"}
]'::jsonb where slug = 'rust-external' and prices is null;

update public.products set prices = '[
 {"name":"3 Days","desc":"Short-term access","price":5,"link":"YOUR_SELLAUTH_3DAY_LINK"},
 {"name":"7 Days","desc":"Weekly access","price":10,"link":"YOUR_SELLAUTH_WEEK_LINK"},
 {"name":"30 Days","desc":"Monthly access","price":15,"link":"YOUR_SELLAUTH_MONTH_LINK"},
 {"name":"Lifetime","desc":"One-time purchase","price":40,"link":"YOUR_SELLAUTH_LIFETIME_LINK"}
]'::jsonb where slug = 'roblox-exec' and prices is null;

update public.products set prices = '[
 {"name":"3 Days","desc":"Short-term access","price":3,"link":"YOUR_SELLAUTH_3DAY_LINK"},
 {"name":"7 Days","desc":"Weekly access","price":6,"link":"YOUR_SELLAUTH_WEEK_LINK"},
 {"name":"30 Days","desc":"Monthly access","price":10,"link":"YOUR_SELLAUTH_MONTH_LINK"},
 {"name":"Lifetime","desc":"One-time purchase","price":30,"link":"YOUR_SELLAUTH_LIFETIME_LINK"}
]'::jsonb where slug = 'roblox-ext' and prices is null;

-- ── 2) Auto-revert expired maintenance windows ──────────────
-- anyone may call it; it can only flip offline→online past the scheduled time
create or replace function public.revert_expired_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
     set status = 'online',
         maintenance_until = null,
         updated_at = now()
   where status = 'offline'
     and maintenance_until is not null
     and maintenance_until <= now();
end;
$$;
grant execute on function public.revert_expired_maintenance() to anon, authenticated;

-- ── 3) Audit log ────────────────────────────────────────────
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text,
  actor_id uuid,
  action text not null,
  target text,
  detail text,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

drop policy if exists "audit read staff" on public.audit_log;
create policy "audit read staff" on public.audit_log for select
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "audit insert staff" on public.audit_log;
create policy "audit insert staff" on public.audit_log for insert
  to authenticated with check (public.app_role() in ('staff','co_owner','owner'));

-- ── 4) Orders / sales ───────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_slug text,
  plan_name text,
  amount numeric(10,2) not null default 0,
  customer text,
  discord_id text,
  status text not null default 'paid',
  note text,
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;

drop policy if exists "orders read staff" on public.orders;
create policy "orders read staff" on public.orders for select
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "orders write staff" on public.orders;
create policy "orders write staff" on public.orders for insert
  to authenticated with check (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "orders delete staff" on public.orders;
create policy "orders delete staff" on public.orders for delete
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

-- ── 5) Coupons ──────────────────────────────────────────────
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percent',
  discount_value numeric(10,2) not null,
  product_slug text,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

drop policy if exists "coupons read staff" on public.coupons;
create policy "coupons read staff" on public.coupons for select
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "coupons write staff" on public.coupons;
create policy "coupons write staff" on public.coupons for insert
  to authenticated with check (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "coupons update staff" on public.coupons;
create policy "coupons update staff" on public.coupons for update
  to authenticated using (public.app_role() in ('staff','co_owner','owner'))
  with check (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "coupons delete staff" on public.coupons;
create policy "coupons delete staff" on public.coupons for delete
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

-- ── 6) License mirror (KeyAuth) ─────────────────────────────
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  keyauth_id text,
  product_slug text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.licenses enable row level security;

drop policy if exists "licenses read staff" on public.licenses;
create policy "licenses read staff" on public.licenses for select
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "licenses write staff" on public.licenses;
create policy "licenses write staff" on public.licenses for insert
  to authenticated with check (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "licenses update staff" on public.licenses;
create policy "licenses update staff" on public.licenses for update
  to authenticated using (public.app_role() in ('staff','co_owner','owner'))
  with check (public.app_role() in ('staff','co_owner','owner'));

drop policy if exists "licenses delete staff" on public.licenses;
create policy "licenses delete staff" on public.licenses for delete
  to authenticated using (public.app_role() in ('staff','co_owner','owner'));

-- done ─ run admin-setup-v2, then supabase functions deploy keyauth-proxy

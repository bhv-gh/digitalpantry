-- Pantry Digitiser – Postgres schema for Supabase.
-- Run this once in Supabase Studio: SQL Editor → New query → paste → Run.
-- Idempotent: safe to re-run.

-- ============================================================
--  Tables
-- ============================================================

create table if not exists public.products (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  barcode     text,
  name        text        not null,
  brand       text        not null default '',
  category    text        not null default '',
  image_url   text        not null default '',
  unit        text        not null default 'pcs',
  source      text        not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists products_user_idx    on public.products (user_id);
create index if not exists products_barcode_idx on public.products (user_id, barcode);
create index if not exists products_name_idx    on public.products (user_id, name);

create table if not exists public.pantry_items (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  product_id   uuid        not null references public.products(id) on delete cascade,
  quantity     numeric     not null default 1,
  unit         text        not null default 'pcs',
  expiry_date  date,
  location     text        not null default 'pantry',
  notes        text        not null default '',
  added_at     timestamptz not null default now()
);
create index if not exists pantry_user_idx    on public.pantry_items (user_id);
create index if not exists pantry_product_idx on public.pantry_items (product_id);
create index if not exists pantry_expiry_idx  on public.pantry_items (user_id, expiry_date);

create table if not exists public.shopping_items (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  quantity    numeric     not null default 1,
  unit        text        not null default 'pcs',
  notes       text        not null default '',
  product_id  uuid        references public.products(id) on delete set null,
  checked     boolean     not null default false,
  added_at    timestamptz not null default now()
);
create index if not exists shopping_user_idx on public.shopping_items (user_id);

-- ============================================================
--  Auto-update updated_at on products
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
--  Row Level Security – each user only sees their own rows.
-- ============================================================

alter table public.products       enable row level security;
alter table public.pantry_items   enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists "owner all" on public.products;
drop policy if exists "owner all" on public.pantry_items;
drop policy if exists "owner all" on public.shopping_items;

create policy "owner all" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner all" on public.pantry_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner all" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  Optional: realtime (live updates across your devices).
--  Run if you want — otherwise leave it.
-- ============================================================

-- alter publication supabase_realtime add table public.products;
-- alter publication supabase_realtime add table public.pantry_items;
-- alter publication supabase_realtime add table public.shopping_items;

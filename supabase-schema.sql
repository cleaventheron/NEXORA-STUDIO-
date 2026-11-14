-- Nexora Studio v2 schema
-- Run this in Supabase Dashboard > SQL Editor.
-- This creates creator profiles and product listings. It does NOT enable payments.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Creator',
  slug text not null unique,
  bio text not null default '',
  tagline text not null default '',
  accent_color text not null default 'purple' check (accent_color in ('purple','blue','mint')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe migration for projects that already ran the v1 schema.
alter table public.profiles add column if not exists accent_color text not null default 'purple';
alter table public.profiles drop constraint if exists profiles_accent_color_check;
alter table public.profiles add constraint profiles_accent_color_check check (accent_color in ('purple','blue','mint'));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  category text not null default 'Digital download',
  image_url text,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;

drop policy if exists "Creators can view own profile" on public.profiles;
create policy "Creators can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

drop policy if exists "Creators can insert own profile" on public.profiles;
create policy "Creators can insert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Creators can update own profile" on public.profiles;
create policy "Creators can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Public can view published profiles" on public.profiles;
create policy "Public can view published profiles" on public.profiles
for select to anon using (published = true);

drop policy if exists "Creators can view own products" on public.products;
create policy "Creators can view own products" on public.products
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Creators can insert own products" on public.products;
create policy "Creators can insert own products" on public.products
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Creators can update own products" on public.products;
create policy "Creators can update own products" on public.products
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Creators can delete own products" on public.products;
create policy "Creators can delete own products" on public.products
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Public can view visible products in published stores" on public.products;
create policy "Public can view visible products in published stores" on public.products
for select to anon using (
  visible = true and exists (
    select 1 from public.profiles
    where profiles.id = products.user_id and profiles.published = true
  )
);

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_created_at_idx on public.products(created_at desc);
create index if not exists profiles_slug_idx on public.profiles(slug);

-- OGC business workspace (multi-member-ready; invitations can be added later).
create table if not exists public.business_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'One Glove Crew',
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_plan text not null default 'founder_free' check (subscription_plan in ('founder_free','standard')),
  created_at timestamptz not null default now()
);
create table if not exists public.business_members (
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','manager','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);
create table if not exists public.business_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  customer_name text not null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  sales_channel text not null default 'local' check (sales_channel in ('local','online')),
  payment_method text not null default 'cash' check (payment_method in ('cash','eft','qr','online')),
  payment_status text not null default 'pending' check (payment_status in ('pending','verified')),
  order_status text not null default 'new' check (order_status in ('new','processing','ready','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.business_inventory (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  product_name text not null,
  colour text not null default '',
  size text not null default 'One size',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now()
);
create or replace function public.is_business_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.business_members where workspace_id=target_workspace and user_id=auth.uid()); $$;
alter table public.business_workspaces enable row level security;
alter table public.business_members enable row level security;
alter table public.business_orders enable row level security;
alter table public.business_inventory enable row level security;
drop policy if exists "Workspace owners create workspaces" on public.business_workspaces;
create policy "Workspace owners create workspaces" on public.business_workspaces for insert to authenticated with check (owner_id=auth.uid());
drop policy if exists "Members view workspaces" on public.business_workspaces;
create policy "Members view workspaces" on public.business_workspaces for select to authenticated using (public.is_business_member(id) or owner_id=auth.uid());
drop policy if exists "Owners update workspaces" on public.business_workspaces;
create policy "Owners update workspaces" on public.business_workspaces for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists "Members view memberships" on public.business_members;
create policy "Members view memberships" on public.business_members for select to authenticated using (user_id=auth.uid() or public.is_business_member(workspace_id));
drop policy if exists "Workspace owner adds self" on public.business_members;
create policy "Workspace owner adds self" on public.business_members for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.business_workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
drop policy if exists "Members read orders" on public.business_orders;
create policy "Members read orders" on public.business_orders for select to authenticated using (public.is_business_member(workspace_id));
drop policy if exists "Members add orders" on public.business_orders;
create policy "Members add orders" on public.business_orders for insert to authenticated with check (public.is_business_member(workspace_id) and created_by=auth.uid());
drop policy if exists "Members update orders" on public.business_orders;
create policy "Members update orders" on public.business_orders for update to authenticated using (public.is_business_member(workspace_id)) with check (public.is_business_member(workspace_id));
drop policy if exists "Members read inventory" on public.business_inventory;
create policy "Members read inventory" on public.business_inventory for select to authenticated using (public.is_business_member(workspace_id));
drop policy if exists "Members add inventory" on public.business_inventory;
create policy "Members add inventory" on public.business_inventory for insert to authenticated with check (public.is_business_member(workspace_id) and created_by=auth.uid());
drop policy if exists "Members update inventory" on public.business_inventory;
create policy "Members update inventory" on public.business_inventory for update to authenticated using (public.is_business_member(workspace_id)) with check (public.is_business_member(workspace_id));
drop policy if exists "Members delete inventory" on public.business_inventory;
create policy "Members delete inventory" on public.business_inventory for delete to authenticated using (public.is_business_member(workspace_id));
create index if not exists business_members_user_id_idx on public.business_members(user_id);
create index if not exists business_orders_workspace_created_idx on public.business_orders(workspace_id,created_at desc);
create index if not exists business_inventory_workspace_idx on public.business_inventory(workspace_id);

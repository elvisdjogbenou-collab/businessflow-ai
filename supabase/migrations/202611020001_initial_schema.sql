create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'XOF',
  created_at timestamptz not null default now()
);

create type public.organization_role as enum ('owner', 'manager', 'member');

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('lead', 'customer')),
  name text not null,
  phone text,
  email text,
  status text not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  body text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  currency text not null default 'XOF',
  status text not null default 'draft',
  total_minor bigint not null check (total_minor >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  paid_at timestamptz not null,
  method text not null,
  reference text,
  status text not null default 'recorded',
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  title text not null,
  notes text,
  due_at timestamptz not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.interactions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.follow_up_tasks enable row level security;

create index if not exists customers_org_status_idx on public.customers(organization_id, status);
create index if not exists orders_org_created_idx on public.orders(organization_id, created_at desc);
create index if not exists payments_org_paid_idx on public.payments(organization_id, paid_at desc);
create index if not exists followups_org_due_idx on public.follow_up_tasks(organization_id, due_at, status);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
grant execute on function public.is_organization_member(uuid) to authenticated;

create policy "profiles_select_self" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_member_select" on public.organizations
  for select to authenticated using (public.is_organization_member(id));

create policy "organization_members_member_select" on public.organization_members
  for select to authenticated using (public.is_organization_member(organization_id));

create policy "customers_member_access" on public.customers
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "interactions_member_access" on public.interactions
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "orders_member_access" on public.orders
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "order_items_member_access" on public.order_items
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "payments_member_access" on public.payments
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy "followups_member_access" on public.follow_up_tasks
  for all to authenticated using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

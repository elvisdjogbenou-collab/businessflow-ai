create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.organizations(name)
  values ('Mon organisation')
  returning id into new_organization_id;

  insert into public.organization_members(organization_id, user_id, role)
  values (new_organization_id, new.id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_email_format'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_email_format
      check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
  end if;
end;
$$;

create or replace function public.prevent_overpayment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_total bigint;
  recorded_total bigint;
begin
  select total_minor into order_total
  from public.orders
  where id = new.order_id and organization_id = new.organization_id
  for update;
  if order_total is null then
    raise exception 'Order does not belong to the same organization';
  end if;

  select coalesce(sum(amount_minor), 0) into recorded_total
  from public.payments
  where order_id = new.order_id
    and organization_id = new.organization_id
    and status = 'recorded'
    and id is distinct from new.id;

  if new.status = 'recorded' and recorded_total + new.amount_minor > order_total then
    raise exception 'Payment exceeds remaining order balance';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_overpayment() from public;

create or replace function public.validate_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_total bigint;
begin
  if new.status = 'paid' then
    select coalesce(sum(amount_minor), 0) into paid_total
    from public.payments
    where order_id = new.id
      and organization_id = new.organization_id
      and status = 'recorded';
    if paid_total <> new.total_minor then
      raise exception 'Paid orders must have a fully recorded payment total';
    end if;
  end if;
  if new.status = 'cancelled' then
    select coalesce(sum(amount_minor), 0) into paid_total
    from public.payments
    where order_id = new.id
      and organization_id = new.organization_id
      and status = 'recorded';
    if paid_total > 0 then
      raise exception 'Orders with recorded payments cannot be cancelled';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_order_status() from public;

drop trigger if exists orders_status_guard on public.orders;
create trigger orders_status_guard
  before update of status on public.orders
  for each row execute function public.validate_order_status();
drop trigger if exists payments_balance_guard on public.payments;
create trigger payments_balance_guard
  before insert or update of amount_minor, order_id, organization_id, status
  on public.payments
  for each row execute function public.prevent_overpayment();

create or replace function public.is_organization_manager(target_organization_id uuid)
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
      and role in ('owner', 'manager')
  );
$$;

revoke all on function public.is_organization_manager(uuid) from public;
grant execute on function public.is_organization_manager(uuid) to authenticated;

drop policy if exists "customers_member_access" on public.customers;
create policy "customers_member_select" on public.customers
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "customers_manager_mutation" on public.customers
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "customers_manager_update" on public.customers
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));
create policy "customers_manager_delete" on public.customers
  for delete to authenticated using (public.is_organization_manager(organization_id));

drop policy if exists "orders_member_access" on public.orders;
create policy "orders_member_select" on public.orders
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "orders_manager_mutation" on public.orders
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "orders_manager_update" on public.orders
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));
create policy "orders_manager_delete" on public.orders
  for delete to authenticated using (public.is_organization_manager(organization_id));

drop policy if exists "order_items_member_access" on public.order_items;
create policy "order_items_member_select" on public.order_items
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "order_items_manager_mutation" on public.order_items
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "order_items_manager_update" on public.order_items
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));
create policy "order_items_manager_delete" on public.order_items
  for delete to authenticated using (public.is_organization_manager(organization_id));

drop policy if exists "payments_member_access" on public.payments;
create policy "payments_member_select" on public.payments
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "payments_manager_mutation" on public.payments
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "payments_manager_update" on public.payments
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));
create policy "payments_manager_delete" on public.payments
  for delete to authenticated using (public.is_organization_manager(organization_id));

drop policy if exists "followups_member_access" on public.follow_up_tasks;
create policy "followups_member_select" on public.follow_up_tasks
  for select to authenticated using (public.is_organization_member(organization_id));
create policy "followups_manager_mutation" on public.follow_up_tasks
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "followups_manager_update" on public.follow_up_tasks
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));
create policy "followups_manager_delete" on public.follow_up_tasks
  for delete to authenticated using (public.is_organization_manager(organization_id));

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null check (invited_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.organization_role not null check (role in ('manager', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists organization_invitations_email_idx
  on public.organization_invitations(lower(invited_email), status);
create unique index if not exists organization_invitations_pending_unique_idx
  on public.organization_invitations(organization_id, lower(invited_email))
  where status = 'pending';

alter table public.organization_invitations enable row level security;

create policy "organization_invitations_manager_select" on public.organization_invitations
  for select to authenticated using (public.is_organization_manager(organization_id));
create policy "organization_invitations_manager_insert" on public.organization_invitations
  for insert to authenticated with check (public.is_organization_manager(organization_id));
create policy "organization_invitations_manager_update" on public.organization_invitations
  for update to authenticated using (public.is_organization_manager(organization_id))
  with check (public.is_organization_manager(organization_id));

create or replace function public.create_organization(new_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(btrim(new_name)) < 2 or char_length(btrim(new_name)) > 100 then
    raise exception 'Invalid organization name';
  end if;
  insert into public.organizations(name)
  values (btrim(new_name))
  returning id into new_organization_id;
  insert into public.organization_members(organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'owner');
  return new_organization_id;
end;
$$;

revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.accept_organization_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation record;
  authenticated_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select email into authenticated_email from auth.users where id = auth.uid();
  select * into invitation
  from public.organization_invitations
  where token = invitation_token
    and status = 'pending'
    and expires_at > now()
  for update;
  if invitation.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;
  if lower(authenticated_email) <> lower(invitation.invited_email) then
    raise exception 'Invitation belongs to another account';
  end if;
  insert into public.organization_members(organization_id, user_id, role)
  values (invitation.organization_id, auth.uid(), invitation.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;
  update public.organization_invitations
  set status = 'accepted'
  where id = invitation.id;
  return invitation.organization_id;
end;
$$;

revoke all on function public.accept_organization_invitation(uuid) from public;
grant execute on function public.accept_organization_invitation(uuid) to authenticated;

create or replace function public.rename_organization(target_organization_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Only organization owners can rename the organization';
  end if;
  if char_length(btrim(new_name)) < 2 or char_length(btrim(new_name)) > 100 then
    raise exception 'Invalid organization name';
  end if;
  update public.organizations
  set name = btrim(new_name)
  where id = target_organization_id;
end;
$$;

revoke all on function public.rename_organization(uuid, text) from public;
grant execute on function public.rename_organization(uuid, text) to authenticated;

alter table public.orders add column if not exists idempotency_key text;
alter table public.payments add column if not exists idempotency_key text;

create unique index if not exists orders_org_idempotency_unique_idx
  on public.orders(organization_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists payments_org_idempotency_unique_idx
  on public.payments(organization_id, idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_status_valid'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders add constraint orders_status_valid
      check (status in ('draft', 'confirmed', 'delivered', 'paid', 'cancelled'));
  end if;
end;
$$;

create or replace function public.prevent_overpayment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_total bigint;
  order_status text;
  recorded_total bigint;
begin
  select total_minor, status into order_total, order_status
  from public.orders
  where id = new.order_id and organization_id = new.organization_id
  for update;
  if order_total is null then
    raise exception 'Order does not belong to the same organization';
  end if;
  if order_status = 'cancelled' then
    raise exception 'Cannot record payment for a cancelled order';
  end if;

  select coalesce(sum(amount_minor), 0) into recorded_total
  from public.payments
  where order_id = new.order_id
    and organization_id = new.organization_id
    and status = 'recorded'
    and id is distinct from new.id;

  if new.status = 'recorded' and recorded_total + new.amount_minor > order_total then
    raise exception 'Payment exceeds remaining order balance';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_overpayment() from public;

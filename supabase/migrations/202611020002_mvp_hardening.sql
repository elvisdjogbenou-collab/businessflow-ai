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
  end;
  return new;
end;
$$;

revoke all on function public.prevent_overpayment() from public;
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

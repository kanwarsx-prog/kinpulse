-- Vault schema: secure, per-family storage for critical items

create table if not exists vault_items (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null,
  owner_id uuid not null,
  title text not null,
  item_type text not null check (item_type in ('document','note','credential','instruction','media')),
  description text,
  tags text[] default '{}',
  storage_path text,
  is_encrypted boolean default false,
  last_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vault_permissions (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references vault_items(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz default now()
);

create table if not exists vault_audit (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references vault_items(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  created_at timestamptz default now()
);

-- RLS
alter table vault_items enable row level security;
alter table vault_permissions enable row level security;
alter table vault_audit enable row level security;

-- Reset policies to allow repeatable execution
drop policy if exists "vault_items_select" on vault_items;
drop policy if exists "vault_items_insert" on vault_items;
drop policy if exists "vault_items_update" on vault_items;
drop policy if exists "vault_items_delete" on vault_items;

drop policy if exists "vault_permissions_select" on vault_permissions;
drop policy if exists "vault_permissions_insert" on vault_permissions;
drop policy if exists "vault_permissions_update" on vault_permissions;
drop policy if exists "vault_permissions_delete" on vault_permissions;
drop policy if exists "vault_permissions_write_guard" on vault_permissions;
drop policy if exists "vault_permissions_update_guard" on vault_permissions;
drop policy if exists "vault_permissions_delete_guard" on vault_permissions;

drop policy if exists "vault_audit_select" on vault_audit;
drop policy if exists "vault_audit_insert" on vault_audit;

-- Storage bucket for vault files
insert into storage.buckets (id, name, public)
values ('vault-files', 'vault-files', false)
on conflict (id) do nothing;

-- Reset storage policies
drop policy if exists "vault_files_select" on storage.objects;
drop policy if exists "vault_files_insert" on storage.objects;
drop policy if exists "vault_files_delete" on storage.objects;

create policy "vault_files_select" on storage.objects
  for select using (
    bucket_id = 'vault-files' and owner = auth.uid()
  );

create policy "vault_files_insert" on storage.objects
  for insert with check (
    bucket_id = 'vault-files' and owner = auth.uid()
  );

create policy "vault_files_delete" on storage.objects
  for delete using (
    bucket_id = 'vault-files' and owner = auth.uid()
  );

-- Push subscriptions (web push)
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_subs_self" on push_subscriptions;
create policy "push_subs_self" on push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "vault_items_select" on vault_items
  for select using (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_items_insert" on vault_items
  for insert with check (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_items_update" on vault_items
  for update using (family_id = (select family_id from profiles where id = auth.uid()))
  with check (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_items_delete" on vault_items
  for delete using (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_permissions_select" on vault_permissions
  for select using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_insert" on vault_permissions
  for insert with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_update" on vault_permissions
  for update using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  )) with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_delete" on vault_permissions
  for delete using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_audit_select" on vault_audit
  for select using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_write_guard" on vault_permissions
  for insert
  with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id
      and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_update_guard" on vault_permissions
  for update using (exists (
    select 1 from vault_items vi
    where vi.id = item_id
      and vi.family_id = (select family_id from profiles where id = auth.uid())
  )) with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id
      and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_permissions_delete_guard" on vault_permissions
  for delete using (exists (
    select 1 from vault_items vi
    where vi.id = item_id
      and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_audit_insert" on vault_audit
  for insert
  with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

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

create policy "vault_items_family" on vault_items
  for select using (family_id = (select family_id from profiles where id = auth.uid()))
  with check (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_permissions_family" on vault_permissions
  for select using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "vault_audit_family" on vault_audit
  for select using (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

-- Limit writes to owners/editors
create policy "vault_items_write" on vault_items
  for all
  using (family_id = (select family_id from profiles where id = auth.uid()))
  with check (family_id = (select family_id from profiles where id = auth.uid()));

create policy "vault_permissions_write" on vault_permissions
  for all
  using (exists (
    select 1 from vault_items vi
    join vault_permissions vp on vp.item_id = vi.id
    where vi.id = item_id
      and vi.family_id = (select family_id from profiles where id = auth.uid())
      and vp.user_id = auth.uid()
      and vp.role in ('owner','editor')
  ))
  with check (true);

create policy "vault_audit_insert" on vault_audit
  for insert
  with check (exists (
    select 1 from vault_items vi
    where vi.id = item_id and vi.family_id = (select family_id from profiles where id = auth.uid())
  ));

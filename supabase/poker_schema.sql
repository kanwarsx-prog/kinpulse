-- Family Poker schema (tables + RLS)

-- Tables
create table if not exists poker_tables (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null,
  name text not null,
  variant text not null default 'holdem' check (variant in ('holdem','short-hand')),
  status text not null default 'open' check (status in ('open','active','finished')),
  small_blind integer not null default 10,
  starting_chips integer not null default 200,
  created_by uuid not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists poker_seats (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid references poker_tables(id) on delete cascade,
  user_id uuid not null,
  seat_no integer not null,
  chips integer not null default 0,
  status text not null default 'active' check (status in ('active','busted','left')),
  last_action_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(table_id, user_id),
  unique(table_id, seat_no)
);

create table if not exists poker_hands (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid references poker_tables(id) on delete cascade,
  hand_no integer not null,
  board_cards jsonb not null default '[]'::jsonb,
  hole_cards jsonb not null default '{}'::jsonb, -- seat_id -> [card, card]
  pot integer not null default 0,
  deck jsonb not null default '[]'::jsonb,
  street text not null default 'preflop' check (street in ('preflop','flop','turn','river','done')),
  status text not null default 'dealing' check (status in ('dealing','betting','showdown','complete')),
  turn_seat_no integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(table_id, hand_no)
);

create table if not exists poker_actions (
  id uuid primary key default uuid_generate_v4(),
  hand_id uuid references poker_hands(id) on delete cascade,
  seat_id uuid references poker_seats(id) on delete cascade,
  action text not null check (action in ('fold','check','call','bet','raise','all_in')),
  amount integer default 0,
  street text not null,
  created_at timestamptz default now()
);

-- RLS
alter table poker_tables enable row level security;
alter table poker_seats enable row level security;
alter table poker_hands enable row level security;
alter table poker_actions enable row level security;

-- Drop policies for repeatable runs (now that tables exist)
drop policy if exists "poker_tables_family" on poker_tables;
drop policy if exists "poker_tables_write" on poker_tables;
drop policy if exists "poker_seats_family" on poker_seats;
drop policy if exists "poker_seats_write" on poker_seats;
drop policy if exists "poker_hands_family" on poker_hands;
drop policy if exists "poker_hands_write" on poker_hands;
drop policy if exists "poker_actions_family" on poker_actions;
drop policy if exists "poker_actions_write" on poker_actions;

create policy "poker_tables_family" on poker_tables
  for select using (family_id = (select family_id from profiles where id = auth.uid()));

create policy "poker_tables_write" on poker_tables
  for all using (family_id = (select family_id from profiles where id = auth.uid()))
  with check (family_id = (select family_id from profiles where id = auth.uid()));

create policy "poker_seats_family" on poker_seats
  for select using (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "poker_seats_write" on poker_seats
  for all using (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  )) with check (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "poker_hands_family" on poker_hands
  for select using (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "poker_hands_write" on poker_hands
  for all using (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  )) with check (exists (
    select 1 from poker_tables pt where pt.id = table_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "poker_actions_family" on poker_actions
  for select using (exists (
    select 1 from poker_hands ph
    join poker_tables pt on pt.id = ph.table_id
    where ph.id = hand_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

create policy "poker_actions_write" on poker_actions
  for all using (exists (
    select 1 from poker_hands ph
    join poker_tables pt on pt.id = ph.table_id
    where ph.id = hand_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  )) with check (exists (
    select 1 from poker_hands ph
    join poker_tables pt on pt.id = ph.table_id
    where ph.id = hand_id and pt.family_id = (select family_id from profiles where id = auth.uid())
  ));

-- Indexes to speed queries
create index if not exists idx_poker_tables_family on poker_tables(family_id);
create index if not exists idx_poker_seats_table on poker_seats(table_id);
create index if not exists idx_poker_hands_table on poker_hands(table_id);
create index if not exists idx_poker_actions_hand on poker_actions(hand_id);

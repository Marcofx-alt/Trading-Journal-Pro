-- Version 18: Broker Sync & Import Center
create table if not exists public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  broker_name text,
  platform text not null default 'MT5',
  account_reference text,
  base_currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.broker_accounts enable row level security;
drop policy if exists "Users manage own broker accounts" on public.broker_accounts;
create policy "Users manage own broker accounts" on public.broker_accounts for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.import_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_platform text not null,
  mapping jsonb not null default '{}'::jsonb,
  broker_account_id uuid references public.broker_accounts(id) on delete set null,
  date_format text not null default 'auto',
  delimiter text default 'auto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);
alter table public.import_profiles enable row level security;
drop policy if exists "Users manage own import profiles" on public.import_profiles;
create policy "Users manage own import profiles" on public.import_profiles for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

alter table public.trades add column if not exists broker_account_id uuid references public.broker_accounts(id) on delete set null;
alter table public.trade_imports add column if not exists broker_account_id uuid references public.broker_accounts(id) on delete set null;
alter table public.trade_imports add column if not exists profile_id uuid references public.import_profiles(id) on delete set null;
alter table public.trade_imports add column if not exists status text not null default 'completed';
alter table public.trade_imports add column if not exists net_profit numeric;
alter table public.trade_imports add column if not exists conflict_rows integer not null default 0;
alter table public.trade_imports add column if not exists rolled_back_at timestamptz;
create index if not exists trades_broker_account_idx on public.trades(user_id,broker_account_id);
create index if not exists trade_imports_user_created_idx on public.trade_imports(user_id,created_at desc);

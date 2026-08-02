-- Sprint 5: Broker import and duplicate protection
alter table public.trades add column if not exists source_platform text;
alter table public.trades add column if not exists external_ticket text;
alter table public.trades add column if not exists import_fingerprint text;
alter table public.trades add column if not exists import_batch_id uuid;

create unique index if not exists trades_user_import_fingerprint_unique
on public.trades(user_id, import_fingerprint)
where import_fingerprint is not null;

create table if not exists public.trade_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_platform text not null,
  file_name text,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  failed_rows integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.trade_imports enable row level security;
drop policy if exists "Users manage own trade imports" on public.trade_imports;
create policy "Users manage own trade imports" on public.trade_imports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

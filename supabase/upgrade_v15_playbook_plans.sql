-- Trading Journal Pro v23.1 — Playbook Plans
create table if not exists public.playbook_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  summary text not null default '',
  bias text not null default '',
  session text not null default '',
  markets text not null default '',
  rules jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  risk_rules jsonb not null default '[]'::jsonb,
  notes text not null default '',
  color text not null default '#60a5fa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.playbook_plans enable row level security;

drop policy if exists "playbook_plans_select_own" on public.playbook_plans;
create policy "playbook_plans_select_own" on public.playbook_plans for select using (auth.uid() = user_id);

drop policy if exists "playbook_plans_insert_own" on public.playbook_plans;
create policy "playbook_plans_insert_own" on public.playbook_plans for insert with check (auth.uid() = user_id);

drop policy if exists "playbook_plans_update_own" on public.playbook_plans;
create policy "playbook_plans_update_own" on public.playbook_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "playbook_plans_delete_own" on public.playbook_plans;
create policy "playbook_plans_delete_own" on public.playbook_plans for delete using (auth.uid() = user_id);

create index if not exists playbook_plans_user_updated_idx on public.playbook_plans(user_id, updated_at desc);

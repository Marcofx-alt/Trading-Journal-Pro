-- Sprint 8: AI Chart Vision
create table if not exists public.chart_vision_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text,
  timeframe text,
  direction text,
  image_path text not null,
  analysis jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.chart_vision_analyses enable row level security;

do $$ begin
  create policy "Users manage own chart vision analyses" on public.chart_vision_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists chart_vision_user_created_idx
  on public.chart_vision_analyses(user_id, created_at desc);

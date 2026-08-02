create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  htf_trend boolean default false,
  valid_zone boolean default false,
  liquidity_sweep boolean default false,
  fvg boolean default false,
  bos boolean default false,
  choch boolean default false,
  confirmation_candle boolean default false,
  news_checked boolean default false,
  correct_session boolean default false,
  risk_managed boolean default false,
  confidence integer default 5 check (confidence between 1 and 10),
  patience integer default 5 check (patience between 1 and 10),
  discipline integer default 5 check (discipline between 1 and 10),
  focus integer default 5 check (focus between 1 and 10),
  stress integer default 5 check (stress between 1 and 10),
  followed_plan boolean default false,
  revenge_trade boolean default false,
  fomo boolean default false,
  overtraded boolean default false,
  moved_stop_loss boolean default false,
  moved_take_profit boolean default false,
  lesson text,
  strategy_score integer default 0,
  psychology_score integer default 0,
  discipline_score integer default 0,
  overall_score integer default 0,
  grade text default 'Needs Review',
  coach_feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, trade_id)
);

alter table public.trade_reviews enable row level security;

drop policy if exists "Users manage own trade reviews" on public.trade_reviews;
create policy "Users manage own trade reviews" on public.trade_reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists trade_reviews_user_id_idx on public.trade_reviews(user_id);
create index if not exists trade_reviews_trade_id_idx on public.trade_reviews(trade_id);

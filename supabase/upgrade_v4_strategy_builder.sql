create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  version text not null default '1.0',
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strategy_rules (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_key text not null,
  label text not null,
  weight integer not null default 10 check (weight between 1 and 100),
  sort_order integer not null default 0,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique(strategy_id, rule_key)
);

alter table public.trades add column if not exists strategy_id uuid references public.strategies(id) on delete set null;
alter table public.trade_reviews add column if not exists strategy_id uuid references public.strategies(id) on delete set null;
alter table public.trade_reviews add column if not exists rule_answers jsonb not null default '{}'::jsonb;

alter table public.strategies enable row level security;
alter table public.strategy_rules enable row level security;

drop policy if exists "Users manage own strategies" on public.strategies;
create policy "Users manage own strategies" on public.strategies
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own strategy rules" on public.strategy_rules;
create policy "Users manage own strategy rules" on public.strategy_rules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists strategies_user_id_idx on public.strategies(user_id);
create index if not exists strategy_rules_strategy_id_idx on public.strategy_rules(strategy_id);
create index if not exists trades_strategy_id_idx on public.trades(strategy_id);

-- Create a starter strategy for each existing user who does not yet have one.
insert into public.strategies (user_id, name, version, description, is_default)
select id, 'Marco.N Core Strategy', '1.0', 'Supply & Demand + Liquidity + FVG + Confirmation', true
from auth.users u
where not exists (select 1 from public.strategies s where s.user_id = u.id);

insert into public.strategy_rules (strategy_id, user_id, rule_key, label, weight, sort_order, is_required)
select s.id, s.user_id, x.rule_key, x.label, x.weight, x.sort_order, x.is_required
from public.strategies s
cross join (values
 ('htf_trend','Higher timeframe trend matched',15,1,true),
 ('valid_zone','Valid supply or demand zone',15,2,true),
 ('liquidity_sweep','Liquidity sweep',15,3,true),
 ('fvg','Fair Value Gap',10,4,false),
 ('bos','Break of Structure',10,5,false),
 ('choch','Change of Character',5,6,false),
 ('confirmation_candle','Confirmation candle',15,7,true),
 ('news_checked','News checked',5,8,false),
 ('correct_session','Correct trading period',5,9,false),
 ('risk_managed','Proper risk management',5,10,true)
) as x(rule_key,label,weight,sort_order,is_required)
where s.name='Marco.N Core Strategy'
and not exists (select 1 from public.strategy_rules r where r.strategy_id=s.id);

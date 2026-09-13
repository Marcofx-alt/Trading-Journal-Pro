-- Trading Journal Pro v23.0 — AI Trading Assistant chat history
create extension if not exists pgcrypto;

create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_chat_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_threads_user_updated_idx
  on public.ai_chat_threads(user_id, updated_at desc);
create index if not exists ai_chat_messages_thread_created_idx
  on public.ai_chat_messages(thread_id, created_at asc);

alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users can manage own AI chat threads" on public.ai_chat_threads;
create policy "Users can manage own AI chat threads"
  on public.ai_chat_threads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own AI chat messages" on public.ai_chat_messages;
create policy "Users can manage own AI chat messages"
  on public.ai_chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

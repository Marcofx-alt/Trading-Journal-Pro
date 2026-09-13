-- Trading Journal Pro v22.6 — Notebook
create extension if not exists pgcrypto;

create table if not exists public.notebook_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.notebook_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Note',
  content text not null default '',
  folder_id uuid null references public.notebook_folders(id) on delete set null,
  note_type text not null default 'note',
  template_key text null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notebook_folders enable row level security;
alter table public.notebook_notes enable row level security;

drop policy if exists "notebook_folders_own_rows" on public.notebook_folders;
create policy "notebook_folders_own_rows" on public.notebook_folders
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notebook_notes_own_rows" on public.notebook_notes;
create policy "notebook_notes_own_rows" on public.notebook_notes
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists notebook_notes_user_updated_idx on public.notebook_notes(user_id, updated_at desc);
create index if not exists notebook_notes_folder_idx on public.notebook_notes(folder_id);

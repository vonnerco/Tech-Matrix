-- Resume-Tailor — per-user candidate fit records (Supabase / Postgres).
--
-- Run once in the Supabase dashboard: SQL Editor → New query → Run.
--
-- Access model: invite-only (public signup disabled in Auth settings). Every row
-- is owned by the signed-in user via `user_id`, and Row Level Security restricts
-- reads/inserts/deletes to that owner. There is deliberately no UPDATE policy,
-- so a saved score can't be changed from the client — only deleted.

create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  resume_name text,
  role        text not null,
  resume      text not null,
  score       real not null,
  verdict     text,
  summary     text,
  dimensions  jsonb not null default '[]'::jsonb,
  strengths   jsonb not null default '[]'::jsonb,
  gaps        jsonb not null default '[]'::jsonb,
  source      text
);

create index if not exists idx_matches_user_created
  on public.matches (user_id, created_at desc);

-- Lock the table down: no access unless a policy allows it.
alter table public.matches enable row level security;

drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own" on public.matches
  for select using (auth.uid() = user_id);

drop policy if exists "matches_insert_own" on public.matches;
create policy "matches_insert_own" on public.matches
  for insert with check (auth.uid() = user_id);

drop policy if exists "matches_delete_own" on public.matches;
create policy "matches_delete_own" on public.matches
  for delete using (auth.uid() = user_id);

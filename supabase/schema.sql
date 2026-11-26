-- Run this once in Supabase Dashboard > SQL Editor > New query.
-- Each user can only read/write their own watchlist rows.
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z0-9.^-]{1,15}$'),
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.watchlist enable row level security;

create policy "Users can read their own watchlist"
  on public.watchlist for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own watchlist"
  on public.watchlist for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own watchlist items"
  on public.watchlist for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.watchlist to authenticated;

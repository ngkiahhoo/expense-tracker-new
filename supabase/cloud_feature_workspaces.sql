-- Cloud storage for account-free features that previously used browser localStorage.
-- Run this in the Supabase SQL editor after future_expense_plans.sql.
create table if not exists public.cloud_feature_workspaces (
  key text primary key check (key in ('financial_events', 'savings_goals', 'event_currencies', 'saved_notes')),
  data jsonb not null,
  revision integer not null default 0,
  legacy_imported boolean not null default false,
  updated_at timestamp with time zone not null default now()
);

alter table public.cloud_feature_workspaces
  add column if not exists legacy_imported boolean not null default false;
alter table public.cloud_feature_workspaces
  drop constraint if exists cloud_feature_workspaces_key_check;
alter table public.cloud_feature_workspaces
  add constraint cloud_feature_workspaces_key_check check (key in ('financial_events', 'savings_goals', 'event_currencies', 'saved_notes'));

insert into public.cloud_feature_workspaces (key, data) values
  ('financial_events', '[]'::jsonb),
  ('savings_goals', '[]'::jsonb),
  ('event_currencies', '["MYR", "SGD"]'::jsonb),
  ('saved_notes', '[]'::jsonb)
on conflict (key) do nothing;

alter table public.cloud_feature_workspaces enable row level security;
drop policy if exists "Read shared cloud feature workspaces" on public.cloud_feature_workspaces;
create policy "Read shared cloud feature workspaces" on public.cloud_feature_workspaces
  for select to anon, authenticated using (true);
drop policy if exists "Update shared cloud feature workspaces" on public.cloud_feature_workspaces;
create policy "Update shared cloud feature workspaces" on public.cloud_feature_workspaces
  for update to anon, authenticated using (true) with check (true);
grant select, update on public.cloud_feature_workspaces to anon, authenticated;

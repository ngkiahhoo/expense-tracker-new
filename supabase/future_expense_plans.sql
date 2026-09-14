-- Shared workspace, matching this application's existing account-free bookkeeping.
create table if not exists public.future_expense_workspace (
  id integer primary key check (id = 1),
  library jsonb not null default '{"plans":[],"types":[],"categories":[],"mappings":[]}'::jsonb,
  revision integer not null default 0,
  imported_ids jsonb not null default '[]'::jsonb,
  constraint valid_library check (
    jsonb_typeof(library->'plans') = 'array' and
    jsonb_typeof(library->'types') = 'array' and
    jsonb_typeof(library->'categories') = 'array' and
    jsonb_typeof(library->'mappings') = 'array'
  )
);
insert into public.future_expense_workspace(id) values (1) on conflict do nothing;
alter table public.future_expense_workspace enable row level security;
drop policy if exists "Read shared expense plans" on public.future_expense_workspace;
create policy "Read shared expense plans" on public.future_expense_workspace for select to anon, authenticated using (id = 1);
drop policy if exists "Update shared expense plans" on public.future_expense_workspace;
create policy "Update shared expense plans" on public.future_expense_workspace for update to anon, authenticated using (id = 1) with check (id = 1);
grant select, update on public.future_expense_workspace to anon, authenticated;

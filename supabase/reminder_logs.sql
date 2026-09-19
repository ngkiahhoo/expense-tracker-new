create table if not exists public.reminder_logs (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone not null default now(),
  reminder_date date,
  source text not null default 'cron',
  status text not null check (status in ('sent', 'skipped', 'error')),
  message text,
  expense_count integer,
  error text
);

alter table public.reminder_logs enable row level security;

drop policy if exists "Read reminder logs" on public.reminder_logs;
create policy "Read reminder logs" on public.reminder_logs
  for select to anon, authenticated using (true);

drop policy if exists "Insert reminder logs" on public.reminder_logs;
create policy "Insert reminder logs" on public.reminder_logs
  for insert to anon, authenticated with check (true);

grant select, insert on public.reminder_logs to anon, authenticated;
grant usage, select on sequence public.reminder_logs_id_seq to anon, authenticated;

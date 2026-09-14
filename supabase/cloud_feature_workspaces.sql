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

-- Full, restorable data export. It includes every public table and its column metadata.
create or replace function public.export_app_backup()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  table_record record;
  table_rows jsonb;
  table_columns jsonb;
  data_row record;
  column_record record;
  sequence_record record;
  constraint_record record;
  table_definition text;
  tables jsonb := '{}'::jsonb;
  columns jsonb := '{}'::jsonb;
  restore_sql text := 'begin;' || E'\n';
begin
  for sequence_record in
    select sequencename from pg_sequences where schemaname = 'public' order by sequencename
  loop
    restore_sql := restore_sql || format('create sequence public.%I;', sequence_record.sequencename) || E'\n';
  end loop;

  for table_record in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  loop
    select string_agg(
      format('%I %s%s%s', a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod),
        case when defaults.adbin is null then '' else ' default ' || pg_get_expr(defaults.adbin, defaults.adrelid) end,
        case when a.attnotnull then ' not null' else '' end),
      ', ' order by a.attnum
    ) into table_definition
    from pg_attribute a
    left join pg_attrdef defaults on defaults.adrelid = a.attrelid and defaults.adnum = a.attnum
    where a.attrelid = ('public.' || quote_ident(table_record.table_name))::regclass
      and a.attnum > 0 and not a.attisdropped;
    restore_sql := restore_sql || format('create table public.%I (%s);', table_record.table_name, table_definition) || E'\n';
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(source)), ''[]''::jsonb) from public.%I source',
      table_record.table_name
    ) into table_rows;
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', column_name,
      'data_type', data_type,
      'udt_name', udt_name,
      'nullable', is_nullable = 'YES',
      'default', column_default,
      'position', ordinal_position
    ) order by ordinal_position), '[]'::jsonb)
    into table_columns
    from information_schema.columns
    where table_schema = 'public' and table_name = table_record.table_name;
    tables := tables || jsonb_build_object(table_record.table_name, table_rows);
    columns := columns || jsonb_build_object(table_record.table_name, table_columns);
    for data_row in execute format('select to_jsonb(__backup_row) as row_data from public.%I __backup_row', table_record.table_name)
    loop
      restore_sql := restore_sql || format(
        'insert into public.%I select * from jsonb_populate_record(null::public.%I, %L::jsonb) on conflict do nothing;',
        table_record.table_name, table_record.table_name, data_row.row_data::text
      ) || E'\n';
    end loop;
  end loop;

  for table_record in
    select table_name
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  loop
    for constraint_record in
      select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint
      where conrelid = ('public.' || quote_ident(table_record.table_name))::regclass
      order by conname
    loop
      restore_sql := restore_sql || format(
        'alter table only public.%I add constraint %I %s;',
        table_record.table_name, constraint_record.conname, constraint_record.definition
      ) || E'\n';
    end loop;
  end loop;

  for table_record in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  loop
    for column_record in
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = table_record.table_name
        and column_default like 'nextval(%'
    loop
      if pg_get_serial_sequence('public.' || table_record.table_name, column_record.column_name) is not null then
        restore_sql := restore_sql || format(
          'select setval(%L, coalesce((select max(%I) from public.%I), 1), true);',
          pg_get_serial_sequence('public.' || table_record.table_name, column_record.column_name),
          column_record.column_name, table_record.table_name
        ) || E'\n';
      end if;
    end loop;
  end loop;
  restore_sql := restore_sql || 'commit;' || E'\n';

  return jsonb_build_object(
    'format', 'expense-tracker-supabase-backup',
    'version', 2,
    'exported_at', now(),
    'schema', jsonb_build_object('tables', columns),
    'tables', tables,
    'restore_sql', restore_sql,
    'restore_instructions', 'Run this project''s Supabase SQL migrations first, then execute restore_sql in the Supabase SQL Editor. It restores all exported public-table rows and resets serial sequences.'
  );
end;
$$;
grant execute on function public.export_app_backup() to anon, authenticated;

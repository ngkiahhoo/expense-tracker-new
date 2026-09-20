create extension if not exists pgcrypto;

create table if not exists workout_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table workout_app_state enable row level security;

drop policy if exists workout_app_state_select_own on workout_app_state;
create policy workout_app_state_select_own
  on workout_app_state for select
  using (auth.uid() = user_id);

drop policy if exists workout_app_state_insert_own on workout_app_state;
create policy workout_app_state_insert_own
  on workout_app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists workout_app_state_update_own on workout_app_state;
create policy workout_app_state_update_own
  on workout_app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  tracking_type text not null check (tracking_type in ('weight_reps', 'reps', 'time', 'weight_time')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references workout_plans(id) on delete cascade,
  exercise_id uuid not null references workout_exercises(id) on delete restrict,
  sort_order integer not null default 0,
  target_sets integer not null default 3,
  target_rep_min integer,
  target_rep_max integer,
  target_duration_min integer,
  target_duration_max integer,
  rest_seconds integer not null default 90
);

create table if not exists workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  schedule_type text not null check (schedule_type in ('interval', 'weekdays', 'none')),
  interval_days integer not null default 2,
  start_date date not null default current_date,
  rotation_index integer not null default 0,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_routine_weekdays (
  routine_id uuid not null references workout_routines(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  primary key (routine_id, weekday)
);

create table if not exists workout_routine_plans (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references workout_routines(id) on delete cascade,
  plan_id uuid not null references workout_plans(id) on delete restrict,
  rotation_order integer not null default 0
);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  plan_id uuid references workout_plans(id) on delete set null,
  routine_id uuid references workout_routines(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null check (status in ('completed', 'partial')),
  plan_name_snapshot text not null
);

create table if not exists workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid references workout_exercises(id) on delete set null,
  exercise_name_snapshot text not null,
  tracking_type_snapshot text not null,
  sort_order integer not null default 0,
  planned_sets_snapshot integer not null default 0,
  rest_seconds_snapshot integer not null default 0,
  status text not null check (status in ('pending', 'completed', 'skipped', 'partial'))
);

create table if not exists workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references workout_session_exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric,
  reps integer,
  duration_seconds integer,
  completed_at timestamptz not null default now()
);

create index if not exists workout_exercises_user_idx on workout_exercises(user_id);
create index if not exists workout_plans_user_idx on workout_plans(user_id);
create index if not exists workout_routines_user_idx on workout_routines(user_id);
create index if not exists workout_sessions_user_started_idx on workout_sessions(user_id, started_at desc);
create index if not exists workout_session_exercises_session_idx on workout_session_exercises(workout_session_id);
create index if not exists workout_sets_exercise_idx on workout_sets(workout_exercise_id);

alter table workout_exercises enable row level security;
alter table workout_plans enable row level security;
alter table workout_plan_exercises enable row level security;
alter table workout_routines enable row level security;
alter table workout_routine_weekdays enable row level security;
alter table workout_routine_plans enable row level security;
alter table workout_sessions enable row level security;
alter table workout_session_exercises enable row level security;
alter table workout_sets enable row level security;

drop policy if exists workout_exercises_own on workout_exercises;
create policy workout_exercises_own on workout_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_plans_own on workout_plans;
create policy workout_plans_own on workout_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_routines_own on workout_routines;
create policy workout_routines_own on workout_routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_sessions_own on workout_sessions;
create policy workout_sessions_own on workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists workout_plan_exercises_own on workout_plan_exercises;
create policy workout_plan_exercises_own on workout_plan_exercises
  for all
  using (
    exists (
      select 1 from workout_plans
      where workout_plans.id = workout_plan_exercises.plan_id
      and workout_plans.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_plans
      where workout_plans.id = workout_plan_exercises.plan_id
      and workout_plans.user_id = auth.uid()
    )
  );

drop policy if exists workout_routine_weekdays_own on workout_routine_weekdays;
create policy workout_routine_weekdays_own on workout_routine_weekdays
  for all
  using (
    exists (
      select 1 from workout_routines
      where workout_routines.id = workout_routine_weekdays.routine_id
      and workout_routines.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_routines
      where workout_routines.id = workout_routine_weekdays.routine_id
      and workout_routines.user_id = auth.uid()
    )
  );

drop policy if exists workout_routine_plans_own on workout_routine_plans;
create policy workout_routine_plans_own on workout_routine_plans
  for all
  using (
    exists (
      select 1 from workout_routines
      where workout_routines.id = workout_routine_plans.routine_id
      and workout_routines.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_routines
      where workout_routines.id = workout_routine_plans.routine_id
      and workout_routines.user_id = auth.uid()
    )
  );

drop policy if exists workout_session_exercises_own on workout_session_exercises;
create policy workout_session_exercises_own on workout_session_exercises
  for all
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_session_exercises.workout_session_id
      and workout_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = workout_session_exercises.workout_session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

drop policy if exists workout_sets_own on workout_sets;
create policy workout_sets_own on workout_sets
  for all
  using (
    exists (
      select 1
      from workout_session_exercises
      join workout_sessions on workout_sessions.id = workout_session_exercises.workout_session_id
      where workout_session_exercises.id = workout_sets.workout_exercise_id
      and workout_sessions.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from workout_session_exercises
      join workout_sessions on workout_sessions.id = workout_session_exercises.workout_session_id
      where workout_session_exercises.id = workout_sets.workout_exercise_id
      and workout_sessions.user_id = auth.uid()
    )
  );

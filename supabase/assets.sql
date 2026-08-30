-- Assets and monthly allocations for the simplified asset module.

create table if not exists assets (
  id serial primary key,
  name text not null,
  current_value numeric(12,2) not null default 0,
  currency text not null default 'MYR' check (currency in ('MYR', 'SGD')),
  is_main boolean not null default false,
  note text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists asset_allocations (
  id serial primary key,
  asset_id integer not null references assets(id) on delete cascade,
  month text not null,
  amount numeric(12,2) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists asset_distribution_records (
  id serial primary key,
  month text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('Liquid Assets', 'Allocated Assets')),
  note text,
  source text not null check (source in ('allocation', 'manual')) default 'manual',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_asset_allocations_asset_id on asset_allocations(asset_id);
create index if not exists idx_asset_allocations_month on asset_allocations(month);
create index if not exists idx_asset_distribution_month on asset_distribution_records(month);
create index if not exists idx_asset_distribution_source on asset_distribution_records(source);
create unique index if not exists assets_one_main_per_currency_idx on assets(currency) where is_main = true;

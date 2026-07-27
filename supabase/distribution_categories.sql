create table if not exists asset_distribution_categories (
  id serial primary key,
  name text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_asset_distribution_categories_name on asset_distribution_categories(name);

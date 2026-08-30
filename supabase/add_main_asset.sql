alter table assets
add column if not exists currency text not null default 'MYR'
check (currency in ('MYR', 'SGD'));

alter table assets
add column if not exists is_main boolean not null default false;

drop index if exists assets_one_main_idx;

create unique index if not exists assets_one_main_per_currency_idx
on assets (currency)
where is_main = true;

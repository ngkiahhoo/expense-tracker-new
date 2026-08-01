alter table expenses
add column if not exists currency text not null default 'MYR'
check (currency in ('MYR', 'SGD'));

alter table incomes
add column if not exists currency text not null default 'MYR'
check (currency in ('MYR', 'SGD'));

alter table asset_distribution_records
add column if not exists currency text not null default 'MYR'
check (currency in ('MYR', 'SGD'));

alter table recurring_expenses
add column if not exists currency text not null default 'MYR'
check (currency in ('MYR', 'SGD'));

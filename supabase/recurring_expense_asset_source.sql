alter table public.recurring_expenses
add column if not exists asset_id integer references public.assets(id) on delete restrict;

create index if not exists recurring_expenses_asset_id_idx on public.recurring_expenses(asset_id);

notify pgrst, 'reload schema';

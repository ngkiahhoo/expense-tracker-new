-- Run this after supabase/payment_plans.sql if your database already has payment plans installed.
-- The full payment_plans.sql file has also been updated with these changes.

begin;

alter table public.payment_plans
add column if not exists asset_id integer references public.assets(id) on delete restrict;

create index if not exists payment_plans_asset_id_idx on public.payment_plans(asset_id);

create or replace function public.sync_payment_expense() returns trigger
language plpgsql set search_path = public as $$
declare item public.payment_installments; plan public.payment_plans; target integer;
begin
  if TG_OP = 'UPDATE' and new.payment_installment_id is distinct from old.payment_installment_id then
    raise exception 'Cannot change the payment plan link';
  end if;
  if TG_OP = 'DELETE' then
    if old.payment_installment_id is null then return old; end if;
    select * into item from public.payment_installments where id = old.payment_installment_id for update;
    update public.assets set current_value = current_value + old.amount, updated_at = now() where id = item.asset_id;
    update public.payment_installments set status = 'reversed' where id = item.id;
    return old;
  end if;
  if new.payment_installment_id is null then return new; end if;
  select * into item from public.payment_installments where id = new.payment_installment_id for update;
  select * into strict plan from public.payment_plans where id = item.plan_id;
  if new.currency is distinct from plan.currency or new.amount <= 0 then
    raise exception 'Plan expenses must keep their currency and a positive amount';
  end if;
  if TG_OP = 'INSERT' then
    if item.status <> 'scheduled' or item.due_date > (now() at time zone 'Asia/Kuala_Lumpur')::date then
      raise exception 'Installment is not due';
    end if;
    if plan.asset_id is not null then
      select id into target from public.assets where id = plan.asset_id and currency = plan.currency for update;
      if target is null then raise exception 'Selected asset is not available for %', plan.currency; end if;
    else
      select id into target from public.assets where is_main and currency = plan.currency for update;
      if target is null then raise exception 'Set a main asset for % before posting payments', plan.currency; end if;
    end if;
    if exists(select 1 from public.assets where id = target and current_value < new.amount) then
      raise exception 'Selected asset does not have enough balance for this payment';
    end if;
    update public.assets set current_value = current_value - new.amount, updated_at = now() where id = target;
    update public.payment_installments set status = 'posted', asset_id = target, amount = new.amount where id = item.id;
  else
    update public.assets set current_value = current_value + old.amount - new.amount, updated_at = now() where id = item.asset_id;
    update public.payment_installments set amount = new.amount where id = item.id;
  end if;
  return new;
end $$;

create or replace function public.process_due_payment_installments() returns integer
language plpgsql set search_path = public as $$
declare item record; processed integer := 0;
begin
  perform pg_advisory_xact_lock(726194201);
  for item in
    select i.*, p.name, p.category_id, p.currency
    from public.payment_installments i join public.payment_plans p on p.id = i.plan_id
    where i.status = 'scheduled' and i.due_date <= (now() at time zone 'Asia/Kuala_Lumpur')::date
      and exists (
        select 1 from public.assets a
        where a.currency = p.currency
          and a.current_value >= i.amount
          and ((p.asset_id is null and a.is_main) or a.id = p.asset_id)
      )
    order by i.due_date, i.id for update of i
  loop
    insert into public.expenses(amount, currency, note, expense_date, category_id, payment_installment_id)
    values(item.amount, item.currency, item.name || ' - Payment ' || item.sequence, item.due_date, item.category_id, item.id);
    processed := processed + 1;
  end loop;
  return processed;
end $$;

drop function if exists public.create_payment_plan(uuid, text, bigint, text, numeric, integer, date);
drop function if exists public.create_payment_plan(uuid, text, bigint, text, numeric, integer, date, numeric[]);
drop function if exists public.create_payment_plan(uuid, text, bigint, text, numeric, integer, date, numeric[], bigint);
drop function if exists public.create_payment_plan(uuid, text, bigint, text, numeric, integer, date, numeric[], bigint, integer);
create or replace function public.create_payment_plan(
  p_id uuid, p_name text, p_category_id bigint, p_currency text,
  p_total numeric, p_count integer, p_first_date date, p_amounts numeric[] default null,
  p_payment_name_id bigint default null, p_asset_id integer default null
) returns uuid language plpgsql set search_path = public as $$
declare cents bigint; base bigint; idx integer; month_start date; due date;
  chosen_name public.payment_names;
begin
  perform pg_advisory_xact_lock(726194201);
  if exists(select 1 from public.payment_plans where id = p_id) then return p_id; end if;
  if p_total is null or p_total <= 0 or p_total > 9999999999.99 or round(p_total, 2) <> p_total
    or p_count is null or p_count not between 1 and 360 or p_first_date is null
    or p_first_date not between date '1900-01-01' and date '2200-01-01' then
    raise exception 'Invalid amount, installment count or date';
  end if;
  cents := p_total * 100;
  if cents < p_count then raise exception 'Each installment must be at least 0.01'; end if;
  if p_amounts is not null then
    if cardinality(p_amounts) <> p_count or array_ndims(p_amounts) <> 1 or array_lower(p_amounts, 1) <> 1
      or exists(select 1 from unnest(p_amounts) amount where amount is null or amount <= 0 or amount > 9999999999.99 or round(amount,2) <> amount)
      or (select sum(amount) from unnest(p_amounts) amount) <> p_total then
      raise exception 'Payment amounts must be positive, have at most two decimal places and add up to the total payable';
    end if;
  end if;
  if p_asset_id is not null and not exists(select 1 from public.assets where id = p_asset_id and currency = p_currency) then
    raise exception 'Selected asset is not available for %', p_currency;
  end if;
  if p_asset_id is null and not exists(select 1 from public.assets where is_main and currency = p_currency) then
    raise exception 'Set a main asset for % before creating a plan', p_currency;
  end if;
  if p_payment_name_id is null then
    p_payment_name_id := public.save_payment_name(p_name);
  end if;
  select * into chosen_name from public.payment_names where id = p_payment_name_id and is_active;
  if not found then raise exception 'Select an active payment name'; end if;
  base := cents / p_count;
  insert into public.payment_plans(id,name,payment_name_id,category_id,currency,asset_id)
    values(p_id,chosen_name.name,chosen_name.id,p_category_id,p_currency,p_asset_id);
  for idx in 0..p_count-1 loop
    month_start := (date_trunc('month', p_first_date) + make_interval(months => idx))::date;
    due := month_start + (least(extract(day from p_first_date)::integer,
      extract(day from month_start + interval '1 month - 1 day')::integer) - 1);
    insert into public.payment_installments(plan_id,sequence,amount,due_date)
    values(p_id,idx+1,coalesce(p_amounts[idx+1],(case when idx = p_count-1 then cents-base*(p_count-1) else base end)::numeric/100),due);
  end loop;
  perform public.process_due_payment_installments();
  return p_id;
end $$;

commit;
notify pgrst, 'reload schema';

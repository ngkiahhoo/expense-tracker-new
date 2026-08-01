insert into types (name)
select 'Commitment'
where not exists (
  select 1
  from types
  where lower(name) = 'commitment'
);

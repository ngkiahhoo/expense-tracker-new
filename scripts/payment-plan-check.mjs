import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// npm install --prefix <temporary-directory> @electric-sql/pglite
// node scripts/payment-plan-check.mjs <temporary-directory>/node_modules/@electric-sql/pglite/dist/index.js
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const source = ts.transpileModule(readFileSync('src/utils/paymentSchedule.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPaymentSchedule } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const preview = buildPaymentSchedule('100', 3, '2024-01-31');
assert.deepEqual(preview, [{ due_date: '2024-01-31', amount: 33.33 }, { due_date: '2024-02-29', amount: 33.33 }, { due_date: '2024-03-31', amount: 33.34 }]);
assert.equal(buildPaymentSchedule('0.02', 3, '2024-01-01').length, 0);
assert.equal(buildPaymentSchedule('1.001', 1, '2024-01-01').length, 0);
assert.equal(buildPaymentSchedule('10', 1, '2024-02-30').length, 0);
assert.equal(buildPaymentSchedule('10', 2, '2025-01-31')[1].due_date, '2025-02-28');
const db = new PGlite();
const baseSchema = `create role anon; create role authenticated;
  create table categories(id bigint primary key);
  insert into categories values(1);
  create table assets(id serial primary key, currency text, is_main boolean, current_value numeric(12,2), updated_at timestamptz);
  insert into assets(currency,is_main,current_value) values('MYR',true,1000),('SGD',true,500);
  create table expenses(id bigserial primary key, amount numeric(12,2), currency text, note text, expense_date date, category_id bigint references categories(id));`;
const migration = readFileSync('supabase/payment_plans.sql','utf8');
try {
  await db.exec(baseSchema);
  await db.exec(migration);
  await db.exec(migration); // Safe to reapply.
  const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
  const create = (id, amount, count, date, currency = 'MYR') => db.query(`select create_payment_plan($1,'Phone',1,$2,$3,$4,$5)`, [id,currency,amount,count,date]);
  const first = '00000000-0000-4000-8000-000000000001';
  await create(first, 100, 3, '2024-01-31');
  assert.equal(Number(await scalar("select current_value from assets where id=1")),900);
  assert.equal(Number(await scalar("select current_value from assets where id=2")),500);
  assert.equal(Number(await scalar('select count(*) from expenses')),3);
  assert.equal(Number(await scalar('select process_due_payment_installments()')),0);
  await create(first,100,3,'2024-01-31');
  assert.equal(Number(await scalar('select count(*) from expenses')),3);
  const stored = (await db.query("select due_date::text, amount from payment_installments order by sequence")).rows.map(i => ({ ...i, amount:Number(i.amount) }));
  assert.deepEqual(stored,preview);
  await db.exec("update expenses set amount=40 where id=1");
  assert.equal(Number(await scalar('select current_value from assets where id=1')),893.33);
  await assert.rejects(db.exec("update expenses set currency='SGD' where id=1"));
  assert.equal(Number(await scalar('select current_value from assets where id=1')),893.33);
  await db.exec("update assets set is_main=false where id=1; insert into assets(currency,is_main,current_value) values('MYR',true,2000)");
  await db.exec('delete from expenses where id=1');
  assert.equal(Number(await scalar('select current_value from assets where id=1')),933.33);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),2000);
  assert.equal(await scalar('select status from payment_installments where id=1'),'reversed');
  assert.equal(Number(await scalar('select process_due_payment_installments()')),0);
  const future = '00000000-0000-4000-8000-000000000002';
  await create(future, 10, 2, '2199-01-31');
  assert.equal(Number(await scalar('select count(*) from expenses')),2);
  await db.exec("select change_payment_installment(4,true,5,'2199-01-31')");
  await db.exec("select change_payment_installment(5,false,7,'2024-02-01')");
  assert.equal(Number(await scalar('select current_value from assets where id=3')),1993);
  await assert.rejects(db.exec("select change_payment_installment(5,false,8,'2024-02-01')"));
  await db.exec('delete from expenses');
  assert.equal(Number(await scalar('select current_value from assets where id=1')),1000);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),2000);
  await db.exec("update assets set is_main=false where currency='SGD'");
  await assert.rejects(create('00000000-0000-4000-8000-000000000003',10,1,'2024-01-01','SGD'));
  assert.equal(Number(await scalar('select count(*) from payment_plans')),2);
  await create('00000000-0000-4000-8000-000000000004',2500,1,'2024-01-01');
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-500);
  await db.exec("select adjust_main_asset_balance('MYR',25); select adjust_main_asset_balance('MYR',-10)");
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-485);
  const customId = '00000000-0000-4000-8000-000000000005';
  const custom = amounts => db.query("select create_payment_plan($1,'Custom',1,'MYR',100,3,'2024-01-31',$2::numeric[])", [customId, amounts]);
  for (const amounts of [[20,30,40], [0,50,50], [-10,50,60], [20.001,30,49.999], [50,50], [null,50,50]]) {
    await assert.rejects(custom(amounts));
    assert.equal(Number(await scalar('select current_value from assets where id=3')),-485);
  }
  await custom([20,30,50]);
  assert.deepEqual((await db.query('select amount from payment_installments where plan_id=$1 order by sequence', [customId])).rows.map(i => Number(i.amount)), [20,30,50]);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-585);
  await custom([20,30,50]);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-585);

  const saveName = async (name, id = null) => (await db.query('select save_payment_name($1,$2)', [name,id])).rows[0].save_payment_name;
  for (const invalid of [null, '', ' \t\n ', 'x'.repeat(201)]) await assert.rejects(saveName(invalid));
  const shopee = await saveName(' \tShopee\n ');
  assert.equal(await scalar(`select name from payment_names where id=${shopee}`),'Shopee');
  assert.equal(await saveName('  sHoPeE   '),shopee);
  await assert.rejects(db.query('insert into payment_names(name) values($1)', ['\tSHOPEE  ']));
  const namedFirst = '00000000-0000-4000-8000-000000000006';
  const namedSecond = '00000000-0000-4000-8000-000000000007';
  const namedSgd = '00000000-0000-4000-8000-000000000008';
  await db.query("select create_payment_plan($1,'Ignored label',1,'MYR',30,2,'2199-01-31',array[10,20]::numeric[],$2)",[namedFirst,shopee]);
  await db.query("select create_payment_plan($1,'  SHOPEE ',1,'MYR',70,2,'2199-01-31',array[30,40]::numeric[])",[namedSecond]);
  await db.exec("update assets set is_main=true where id=2");
  await db.query("select create_payment_plan($1,null,1,'SGD',50,1,'2199-01-31',null,$2)",[namedSgd,shopee]);
  assert.equal(Number(await scalar(`select count(*) from payment_plans where payment_name_id=${shopee}`)),3);
  assert.equal(Number(await scalar(`select count(*) from payment_plans where payment_name_id=${shopee} and name='Shopee'`)),3);
  assert.deepEqual((await db.query(`select p.currency, sum(i.amount)::text as total
    from payment_plans p join payment_installments i on i.plan_id=p.id
    where p.payment_name_id=$1 and i.status='scheduled' group by p.currency order by p.currency`,[shopee])).rows,
  [{currency:'MYR',total:'100.00'},{currency:'SGD',total:'50.00'}]);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-585);
  assert.equal(Number(await scalar('select current_value from assets where id=2')),500);
  const firstNamedInstallment = await scalar(`select id from payment_installments where plan_id='${namedFirst}' and sequence=1`);
  const secondNamedInstallment = await scalar(`select id from payment_installments where plan_id='${namedFirst}' and sequence=2`);
  await db.query("select change_payment_installment($1,false,10,'2024-01-31')",[firstNamedInstallment]);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-595);
  assert.equal(await saveName('  Shopee  Pay\tLater ',shopee),shopee);
  assert.equal(Number(await scalar(`select count(*) from payment_plans where payment_name_id=${shopee} and name='Shopee Pay Later'`)),3);
  assert.equal(await scalar(`select note from expenses where payment_installment_id=${firstNamedInstallment}`),'Shopee - Payment 1');
  await assert.rejects(saveName(' custom ',shopee),/already exists/);
  await assert.rejects(saveName('Missing',999999),/not found/);
  await assert.rejects(db.query('select remove_payment_name($1)',[999999]),/not found/);
  await db.query('select remove_payment_name($1)',[shopee]);
  assert.equal(await scalar(`select is_active from payment_names where id=${shopee}`),false);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-595);
  const rejectedPlan = '00000000-0000-4000-8000-000000000009';
  await assert.rejects(db.query("select create_payment_plan($1,'Shopee',1,'MYR',10,1,'2024-01-31',null,$2)",[rejectedPlan,shopee]),/active payment name/);
  assert.equal(Number(await scalar(`select count(*) from payment_plans where id='${rejectedPlan}'`)),0);
  await db.exec(migration);
  assert.equal(await scalar(`select is_active from payment_names where id=${shopee}`),false);
  assert.equal(Number(await scalar(`select count(*) from payment_plans where payment_name_id=${shopee}`)),3);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-595);
  await db.query("update payment_installments set due_date='2024-02-29' where id=$1",[secondNamedInstallment]);
  assert.equal(Number(await scalar('select process_due_payment_installments()')),1);
  assert.equal(Number(await scalar('select current_value from assets where id=3')),-615);
  assert.equal(await scalar(`select note from expenses where payment_installment_id=${secondNamedInstallment}`),'Shopee Pay Later - Payment 2');
  assert.equal(await scalar(`select note from expenses where payment_installment_id=${firstNamedInstallment}`),'Shopee - Payment 1');
  assert.equal(Number(await scalar('select process_due_payment_installments()')),0);
  assert.equal(await saveName(' shopee PAY   later '),shopee);
  assert.equal(await scalar(`select is_active from payment_names where id=${shopee}`),true);
  assert.equal(await scalar(`select name from payment_names where id=${shopee}`),'Shopee Pay Later');
  assert.equal(Number(await scalar("select count(*) from pg_proc where proname='create_payment_plan'")),1);
  console.log('PASS: schedule rounding, validation, automatic posting, idempotency, asset updates/reversal, custom amounts, payment name normalization, duplicate reuse, grouped totals by currency, rename history, archive, reactivation and migration reapplication.');
} finally { await db.close(); }

const legacyDb = new PGlite();
try {
  await legacyDb.exec(baseSchema);
  await legacyDb.exec(`create table payment_plans (
    id uuid primary key, name text not null, category_id bigint not null references categories(id),
    currency text not null, created_at timestamptz not null default now());
    insert into payment_plans(id,name,category_id,currency,created_at) values
      ('00000000-0000-4000-8000-000000000101','  Shopee  ',1,'MYR','2024-01-01'),
      ('00000000-0000-4000-8000-000000000102','sHOPEE',1,'MYR','2024-02-01'),
      ('00000000-0000-4000-8000-000000000103',E'Second \t Name',1,'SGD','2024-02-01');
    insert into expenses(amount,currency,note,expense_date,category_id) values(12,'MYR','  Shopee   - Payment 1','2024-01-01',1);
    create function create_payment_plan(uuid,text,bigint,text,numeric,integer,date) returns uuid language sql as 'select $1';
    create function create_payment_plan(uuid,text,bigint,text,numeric,integer,date,numeric[]) returns uuid language sql as 'select $1';`);
  await legacyDb.exec(migration);
  const legacyScalar = async sql => Object.values((await legacyDb.query(sql)).rows[0])[0];
  assert.equal(Number(await legacyScalar('select count(*) from payment_names')),2);
  assert.equal(Number(await legacyScalar('select count(distinct payment_name_id) from payment_plans')),2);
  assert.equal(Number(await legacyScalar("select count(*) from payment_plans where name='Shopee'")),2);
  assert.equal(Number(await legacyScalar("select count(*) from payment_names where name='Second Name'")),1);
  assert.equal(Number(await legacyScalar("select count(*) from pg_proc where proname='create_payment_plan'")),1);
  const legacyShopee = await legacyScalar("select id from payment_names where name='Shopee'");
  await legacyDb.query('select remove_payment_name($1)',[legacyShopee]);
  await legacyDb.exec(migration);
  assert.equal(await legacyScalar(`select is_active from payment_names where id=${legacyShopee}`),false);
  assert.equal(Number(await legacyScalar('select count(*) from payment_names')),2);
  assert.equal(Number(await legacyScalar(`select count(*) from payment_plans where payment_name_id=${legacyShopee}`)),2);
  assert.equal(await legacyScalar('select note from expenses'),'  Shopee   - Payment 1');
  assert.equal(Number(await legacyScalar('select current_value from assets where id=1')),1000);
  console.log('PASS: legacy names backfill into shared identities, old RPC overload removal, historical records preserved, and archived names remain archived after rerunning migration.');
} finally { await legacyDb.close(); }

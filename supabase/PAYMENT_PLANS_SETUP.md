# Payment plans setup

If the app reports a missing payment names table or payment plan function / schema cache error, run the **entire latest** `payment_plans.sql` in the SQL Editor of the same Supabase project configured in `.env.local`. It can be rerun without deleting existing plans. It installs the selectable payment names, custom monthly amounts and automatic posting functions, then reloads the API schema cache. Refresh the app afterwards. Running only the Cron script does not install the tables or functions.

Creation now accepts a different amount for each month. Amounts must be positive, have at most two decimal places, and sum to Total payable. Both the form and database validate this before any expense or asset change. Changing the total or number of months resets the preview to equal amounts; Split equally also resets manual edits.

Payment names are reusable options stored in `payment_names`. Creating a name trims leading/trailing whitespace and collapses repeated whitespace; matching ignores letter case. Adding `Shopee` again selects the existing identity instead of creating a duplicate. Existing free-text plan names are automatically linked to these identities when the migration runs. Plans with the same name and currency can therefore be displayed together, with their remaining amounts and monthly installments added together. Each original plan and installment stays separate for editing, cancellation, expense links and exactly-once posting; currencies remain separate.

Renaming an option also updates its linked plan labels. Expenses already posted keep their original notes, amounts and asset effects; later scheduled postings use the new name. Removing an option archives it from the creation menu and preserves existing plans, records and automatic deductions. It does **not** cancel future installments; cancel those installments explicitly if needed. Adding the same name later restores the original option and its shared identity. Rerunning the migration does not restore archived options. Renaming into another existing name is rejected; select that existing name for new plans instead.

The name RPCs are `save_payment_name(p_name text, p_id bigint default null)` (returns the created, reused or renamed ID) and `remove_payment_name(p_id bigint)` (archives). `create_payment_plan` accepts optional `p_payment_name_id bigint` after `p_amounts`; selected IDs must be active. Older callers using the original seven arguments or eight arguments with custom amounts still work and reuse names through `p_name`. The migration removes old overloads so Supabase exposes one unambiguous create function.

1. Run `payment_plans.sql` in the Supabase SQL Editor after the existing asset and currency migrations.
2. Enable **Cron / pg_cron** in the Supabase dashboard, then run `payment_plans_cron.sql`.
3. In Cron, verify that `post-payment-installments` is active and its run history succeeds.
4. Configure a Main Asset for each currency you use.

Cron runs every five minutes. The processor uses the current date in Asia/Kuala_Lumpur, catches up all missed dates, and writes expenses using their due dates. The browser also runs the same idempotent processor on opening, focus and every minute. Browser processing is a fallback, not a replacement for Cron.

Creating a past-dated plan posts due installments immediately; do not recreate expenses already recorded manually. The save button shows the immediate deduction before submission. Total payable includes any fees. Monthly rounding differences go into the final installment.

Each posting, asset deduction and status update is one database transaction. Missing Main Assets leave payments scheduled. Negative balances are allowed. Editing a linked expense adjusts its original asset; deleting it restores that asset and marks the installment reversed, so it is never regenerated. Linked expenses cannot change currency. A referenced asset cannot be deleted while payment history depends on it. Future installments can be edited or cancelled in Pay Later.

Cash flow shows scheduled deductions separately from booked expenses, using the current Main Asset balance. It excludes future income and unplanned spending. This records planned cash movements; it does not connect to a bank.

The migration follows the repository's existing shared anonymous ledger access model. Functions run with caller permissions. Cron should be installed by the database owner.

Database tests use disposable PGlite databases and never write to the live Supabase project. They cover automatic posting and asset updates, custom amounts, name normalization and reuse, totals separated by currency, rename history, archived plans continuing to post, and migration/backfill reapplication:

```powershell
$paymentTestRoot = Join-Path $env:TEMP 'expense-payment-tests'
npm install --prefix $paymentTestRoot --no-package-lock --no-audit --no-fund @electric-sql/pglite
node scripts/payment-plan-check.mjs "$paymentTestRoot/node_modules/@electric-sql/pglite/dist/index.js"
```

Mobile UI checks use mocked external responses and do not touch live records. With Edge installed, run the app on port 3100, then:

```powershell
npm install --prefix $paymentTestRoot --no-package-lock --no-audit --no-fund playwright
node scripts/payment-plan-ui-check.mjs "$paymentTestRoot/node_modules/playwright/index.mjs"
```

Cron documentation: https://supabase.com/docs/guides/cron/quickstart

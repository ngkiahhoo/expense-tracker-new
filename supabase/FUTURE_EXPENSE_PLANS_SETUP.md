# Future expense plans

Run `future_expense_plans.sql` in the SQL Editor of the Supabase project used by this app, then deploy the updated app to Vercel.

This app currently has no login or per-user ownership. This table follows the existing shared bookkeeping model: devices using this deployment share the same plans. Its anonymous access policies are for that shared workspace, not private user accounts.

After deployment, open Future Living Expense Plan in the original desktop browser. Its existing `expense-tracker-future-planning-v2` library is imported automatically. Wait for “Saved to database”, then open the page on the phone. The original browser data is retained. The database records imported IDs so an old browser does not recreate a deleted plan. Cloud copies take precedence when IDs already exist.

The page refreshes from the database every 10 seconds and when focused. Writes use revision checks to reject stale device updates. Failed saves show an error and allow retry; unsynced edits can be downloaded as JSON before reloading. A missing table or failed read never appears as a successful empty plan list.

Validation: `npm run test:living-expenses`, `node scripts/expense-storage-check.mjs`, `npm run build`.

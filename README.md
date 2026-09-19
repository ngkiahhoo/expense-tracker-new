# Expense Tracker Next

Personal finance dashboard for monthly income, spending, balance, assets, analytics, and AI export.

## Project Notes

- UI rules live in [UI_README.md](./UI_README.md).
- Main user flow lives on `/`.
- Bottom tools are required: Add Expense, Repeat Monthly, Category CRUD, Records History, and Pay Later / Installments.
- Expanded Action tools allow at most four buttons per row on every screen size. The first four stay in the bottom tool row; additional buttons fill new rows above, while Action and Settings remain anchored at the bottom.
- Monthly Income opens income management by clicking the amount.
- Total Spending opens spending drilldown by clicking the amount.
- Total Assets opens asset details by clicking the card.

## Data storage

All user-created product data is persisted in Supabase. This includes bookkeeping records and assets, Living Cost Plans, Savings Goals, Financial Events, Event currencies, and Saved Notes. Browser `localStorage` is used only once to import legacy data into Supabase; it is not the ongoing source of truth.

Before deploying, run the SQL files in [`supabase/`](./supabase/), including [`cloud_feature_workspaces.sql`](./supabase/cloud_feature_workspaces.sql). The application is account-free today, so these workspaces are shared by the configured Supabase project.

Settings → **Export all data** downloads a `.sql` file. It creates every current `public` table, restores all rows, recreates constraints, and resets serial sequences. Paste the file into the Supabase SQL Editor of an empty project and run it.

## Commands

```bash
npm run dev
npm run build
npm run lint
```

## Telegram reminders

Forgotten expense reminders can send Telegram bot messages. Create a bot with
`@BotFather`, then add the token to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=123456:your-bot-token
TELEGRAM_REMINDER_CHAT_ID=1445140992
NEXT_PUBLIC_APP_URL=https://expense-tracker-next-eta.vercel.app/
```

Restart `npm run dev`, open Settings -> Reminder, enable Telegram message, enter
your chat ID, then use Test Telegram.

For background reminders on Vercel, set the same environment variables in the
Vercel project. `vercel.json` calls `/api/cron/expense-reminder` every day at
`13:00 UTC`, which is `21:00` in Malaysia. The cron route checks today's
expenses in Supabase and sends Telegram only when there are no records for the
day. Set an optional `CRON_SECRET` in Vercel to make the endpoint accept only
Vercel cron calls.

Run [`supabase/reminder_logs.sql`](./supabase/reminder_logs.sql) to enable the
Settings -> Logs panel. The reminder still sends if log writing fails, but the
panel needs this table to show each run.

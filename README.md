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

## Commands

```bash
npm run dev
npm run build
npm run lint
```

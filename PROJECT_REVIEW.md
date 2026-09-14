# Project review ¡ª 2026-09-14

## Fixed

- Expense drilldown was trapped below the app navigation by nested stacking contexts and the pull-to-refresh container. Shared body portals now isolate expense, asset, export and quick-action overlays from page layout.
- Expense sheets now constrain the whole panel to the dynamic viewport, keep the header visible and scroll the record list. Mobile bottom safe-area spacing is included.
- Expense record labels now resolve category names from the category list when history queries omit joined category data. Direct category navigation uses the same fallback for its type.
- Root theme synchronization now belongs to AppShell, preserving the light theme when navigating from the dashboard to other routes and in portalled overlays.
- Toasts remain above modal overlays so save/delete failures remain visible.
- Removed an unused lint import and updated outdated payment-menu locators and living-cost database mocks.

## Validation

- ESLint, TypeScript and production build passed.
- Living-expense calculations, expense-storage migration, expense synchronization, goal projection and payment grouping checks passed.
- Payment SQL checks passed against temporary PGlite: posting, idempotency, reversal, rounding, name identity and migration reapplication.
- Browser checks passed for payment-name management, installment creation and missing-setup feedback using mocked external requests.
- Living-cost browser checks passed for editing, totals, persistence, refreshed categories and mobile width in development and production builds.
- New overlay browser regression passed in development and production at 430¡Á932, 320¡Á568, 932¡Á430 and 1440¡Á900: viewport containment, covering navigation, three-level drilldown, category labels, scrolling to and editing the final record, asset overlay and light-theme route navigation.

## Reproduce browser checks

Install Playwright into a temporary directory and pass its index.mjs path. Microsoft Edge must be installed. Start the app locally first.

```text
node scripts/overlay-ui-check.mjs <temporary-directory>/node_modules/playwright/index.mjs http://localhost:3100
node scripts/living-expense-ui-check.mjs <temporary-directory>/node_modules/playwright/index.mjs http://localhost:3100
node scripts/payment-plan-ui-check.mjs <temporary-directory>/node_modules/playwright/index.mjs
```

## Limits

Browser requests to external services were mocked. No live Supabase records were written and no Vercel deployment was performed. Actual device Safari, live database permissions and deployed migrations remain unverified. Passing these checks does not establish that every possible workflow is defect-free.

# Living-plan projections

Assets supply current balances. A Living Cost Plan supplies expected monthly income minus enabled, classified monthly expenses. A Savings Goal stores `living_plan_id`, included asset IDs, target, optional date, currency and status. It does not copy the plan's income or expenses.

`livingPlanCashFlow` in `src/utils/livingExpense.ts` is shared by both pages. Deterministic goal, milestone, what-if, target-date and actual-history calculations live in `src/utils/goalProjection.ts`. Dates use whole calendar months plus the proportional length of the next calendar month, rounded up to the next day. Tests pass a fixed current date.

Zero income has no defined savings rate. Zero or negative saving has no future ETA. Reached goals have no future ETA. No selected assets means zero; missing or mismatched assets produce an explicit error. This app has no FX conversion, so mismatched plan, goal or asset currencies block the projection.

Reality Check reads only the last three completed calendar months. Months without transactions contribute zero; if all three have no records, it shows no data. History never supplies the main ETA. What-if state is isolated from plan and goal persistence.

## Existing data

The existing Supabase `future_expense_workspace.library` JSON supports optional `monthly_income` and `months_to_project`. No SQL migration is needed. Legacy plans read as zero income and 12 months; editing writes the new values. Duplicating a plan preserves both fields.

Savings Goals continue to use their existing browser storage (`expense-tracker-savings-goals`); this change does not add cross-device goal storage. Legacy goals get no automatically selected plan. Snapshots, manual amounts and legacy settings remain in saved data, but do not drive projections. On the first save, the original goals JSON is retained under `expense-tracker-savings-goals-before-living-plan`. Corrupt storage blocks writes instead of replacing existing goals with an empty list.

The old page's percentile ranges, confidence, scenario predictions, velocity and snapshot-derived ETA have been removed. Snapshot data structures and parsing remain available for historical use.

## Checks

- `npm run test:goals`
- `npm run test:living-expenses`
- `npm run test:expense-sync`
- `npm run typecheck`
- `npm run build`

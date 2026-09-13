# Life Scenarios and Future Expense Plans

Open **Dashboard ? Settings ? Life Plans**, or `/life-scenarios`.

## Primary workflow

1. Select available liquid assets and review current income.
2. Create or select a reusable **Future Expense Plan**.
3. Add planned items, or explicitly import historical / recurring suggestions. Map each item to a user-managed type and category.
4. Review and confirm the living plan and temporary commitments.
5. Select an expense plan for every life phase, define income, and optionally override individual planned amounts.
6. Add dated events and run the projection.

Inflation, expected yield, FX and savings-goal snapshots remain collapsible advanced settings.

## Source of truth and classifications

`FutureExpenseType ? FutureExpenseCategory ? FutureExpenseItem` is a user-managed hierarchy. Types and categories can be created, renamed, described, reordered, moved, disabled and safely deleted. Items support create, edit, duplicate, delete, enable/disable, optional active dates and payment days.

The optional starter types **Needs / Wants / Commitments** are ordinary editable records. Calculations never depend on these names. A type's configurable behavior tag is **MANDATORY**, **REDUCIBLE**, **OPTIONAL** or **COMMITMENT**. A fixed-amount flag can also protect individual items from inflation and percentage generation.

Disabling a type or category excludes its children from future spending without deleting them. This is displayed in the editor and affected plans require confirmation again. Deletion of populated types/categories requires child reassignment; no silent cascade is implemented. Reassignment updates item type/category IDs and saved import mappings while preserving item IDs and phase overrides.

Each plan shows an immediate base monthly total, dynamic type amounts/percentages and category drill-downs. Items are grouped by type and category, with type/category/source/enabled filters.

## History and imports

Historical spending is reference data only. It is never read as a source of future living costs by the projection/calendar engine.

- Suggestions use up to six completed calendar months; the incomplete current month is excluded.
- Zero-activity months between the first available month and the latest completed month count in the average.
- Historical transactions linked to recurring charges or instalments are excluded from the lifestyle suggestions to prevent double counting.
- **Build from historical spending** creates editable planned items, retaining the historical amount for comparison.
- **Import recurring commitments** creates planned items with the recurring source ID, original amount and payment day. Classification belongs to the user.
- Reimporting an existing source preserves the user's planned amount and does not add another item.
- Unmatched categories are shown as **Unmapped** and must be mapped (or the item disabled) before confirmation. Explicit mappings are reused on subsequent imports and maintained when categories move.
- Duplicating an individual item creates an explicitly user-created expense with a new ID and no recurring source reference.
- Source table imports are read-only, paginated and fail visibly rather than silently omitting commitments.

Actual income, expenses, assets, recurring records and liability schedules are never modified by planning operations.

## Expense calendar and projection

Confirmed plans are the only source of future living expenses. Each phase selects a plan; uncovered dates use the scenario's explicitly selected default plan. Phase overrides retain the item's type/category and do not modify the reusable plan. Changing a phase's selected plan clears its obsolete overrides.

The expense calendar combines the selected plan, item active dates, phase overrides, recurring payment days, scheduled liabilities, one-time costs and optional inflation. That calendar feeds the existing projection engine.

Monthly living amounts are prorated by calendar day. Dated payments occur on their payment day, clamped to month end. A recurring source is charged at most once per calendar month even if the selected plan changes mid-month. Historical averages, imported recurring items and liability schedules are never added independently on top of that calendar.

Instalments remain **Temporary Commitments**, not permanent living items. Only scheduled repayments are imported; overdue scheduled payments are placed on the baseline date for review. Each liability stops at its final dated payment.

Results distinguish:

- Base monthly living cost from enabled plan items.
- Month-specific living cost, temporary instalments, one-time costs and expected total spending.
- Average / total scenario spending and total fixed commitments.
- Each phase's duration, nominal monthly living cost, living expenses, temporary commitments, one-time costs, income, total cost and net cashflow.

Phase net cashflow excludes month-end expected yield; the month-by-month balance projection includes it. Partial-month costs and inflation use the same calendar as the main projection.

Required starting funds, funding gap, lowest balance, reserve buffer, readiness, comparison, charts and savings-goal integration remain available. Runway uses the same engine with the selected default living plan and no income. These are starting/month-end balance calculations, not intraday liquidity guarantees.

Current-month actual cashflows are displayed for reference and never deducted again from current assets. For a future start, enter the funds expected to be available on that date.

## Lifestyle variants and advanced assumptions

Lean / Normal / Comfortable plans are explicit copies. Optional percentage generation affects only REDUCIBLE and OPTIONAL items without a fixed-amount flag. MANDATORY and COMMITMENT costs stay unchanged. The generated amounts become ordinary editable items; there is **no runtime lifestyle multiplier**.

Inflation is off by default and compounds monthly on variable planned costs, excluding fixed items, COMMITMENT behavior, scheduled liabilities and one-time costs. Expected yield is off by default and applies to the smaller of positive opening cash and the eligible balance cap; negative rates above -100% are supported.

MYR/SGD items retain original currencies and amounts. Scenario FX assumptions are editable and required for enabled foreign-currency costs; no market rates are invented. Financial comparisons use a common base currency.

Job-transition workflows retain separate employment and salary dates. Rent/transport shortcuts override explicitly selected expense item IDs, without inventing new historical expenses or classifying by name. Unknown-job 3/6/12-month variants retain their selected plans. Readiness uses the reviewed saving pace and is not calculated for a positive gap with non-positive pace.

## Persistence and migration

Plans, hierarchy, mappings and scenarios are browser-local, not cloud synced. They share an atomic versioned workspace at `expense-tracker-future-planning-v2`.

Reusable plan/hierarchy changes save immediately and apply to all scenarios using the plan. Financial edits invalidate plan confirmation. Scenario settings and phase overrides still use the explicit scenario Save button. A plan referenced by a saved scenario cannot be deleted until those assignments are changed and saved.

Existing v1 scenarios migrate deterministically to explicit **draft** expense plans, preserving amounts and phase overrides. Old lifestyle multipliers are materialized into item amounts once. Users review and confirm the migrated plan before projecting. The original `expense-tracker-life-scenarios-v1` data is retained untouched as a backup.

Malformed data and storage failures are reported and are never overwritten with an empty collection. Concurrent library changes in another tab are rejected rather than silently overwritten.

Creating a savings goal still requires an explicit in-app confirmation; existing goals are unchanged.

## Implementation and verification

- `src/types/futureExpense.ts`: plans, items, hierarchy, mappings and calendar entries.
- `src/utils/futureExpense.ts`: imports, summaries, safe reassignment, explicit copies and calendar generation.
- `src/utils/planningWorkspace.ts`: schema validation and v1 migration.
- `src/utils/lifeScenario.ts`: income, calendar-driven projection and financial analysis.
- `src/hooks/useLifeScenarios.ts`: atomic local persistence.
- `FutureExpensePlanEditor.tsx`, `FutureExpenseHierarchy.tsx`, `FutureExpenseAnalysis.tsx`: primary plan editor, hierarchy manager and cost analysis.

Run:

```text
npm run test:scenarios
npm run typecheck
npm run lint
npm run build
```

The 36 financial checks include the original scenario regressions plus source-of-truth, deduplication, mapping, hierarchy, reassignment, overrides, dates, phase totals and migration cases.

Browser suites use temporary Playwright and installed Edge, isolated local storage, and mocked external requests:

```text
node scripts/life-scenario-ui-check.mjs <playwright-install>/index.mjs http://localhost:3101
node scripts/future-expense-ui-check.mjs <playwright-install>/index.mjs http://localhost:3101
```

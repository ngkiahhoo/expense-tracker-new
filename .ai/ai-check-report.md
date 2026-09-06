# AI Debug Report

Status: FAILED
Generated: 2026-09-02T10:26:09.211Z
Project: expense-tracker-next

## What Ran

- FAIL ESLint: `npm run lint -- --format stylish`
- FAIL TypeScript: `npx tsc --noEmit --pretty false`
- FAIL Next Build: `npm run build`

## Failing Output

### ESLint

```text
C:\Projects\expense-tracker-next\src\components\AnalyticsPanel.tsx
  44:11  error  Parsing error: Identifier expected
✖ 1 problem (1 error, 0 warnings)
```

### TypeScript

```text
src/components/AnalyticsPanel.tsx(44,12): error TS1003: Identifier expected.
src/components/AnalyticsPanel.tsx(44,24): error TS1005: ':' expected.
src/components/AnalyticsPanel.tsx(45,14): error TS1003: Identifier expected.
src/components/AnalyticsPanel.tsx(45,26): error TS1005: ':' expected.
src/components/AnalyticsPanel.tsx(46,23): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(47,24): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(47,35): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(50,12): error TS1003: Identifier expected.
src/components/AnalyticsPanel.tsx(50,19): error TS1005: ':' expected.
src/components/AnalyticsPanel.tsx(51,14): error TS1003: Identifier expected.
src/components/AnalyticsPanel.tsx(51,21): error TS1005: ':' expected.
src/components/AnalyticsPanel.tsx(52,23): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(53,24): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(53,30): error TS1005: ',' expected.
src/components/AnalyticsPanel.tsx(55,3): error TS1128: Declaration or statement expected.
```

### Next Build

```text
▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
Error: Turbopack build failed with 1 errors:
./src/components/AnalyticsPanel.tsx:44:12
Unexpected token `string literal`. Expected yield, an identifier, [ or {
  [90m42 |[0m     },
  [90m43 |[0m     {
[31m[1m>[0m [90m44 |[0m       key: [32m"commitment"[0m,
  [90m   |[0m            [31m[1m^^^^^^^^^^^^[0m
  [90m45 |[0m       label: [32m"Commitment"[0m,
  [90m46 |[0m       value: analytics.commitment,
  [90m47 |[0m       color: toneStyles.commitment.chart,
Parsing ecmascript source code failed
Import traces:
  Client Component Browser:
    ./src/components/AnalyticsPanel.tsx [Client Component Browser]
    ./src/components/DashboardAnalyticsSection.tsx [Client Component Browser]
    ./src/app/page.tsx [Client Component Browser]
    ./src/app/page.tsx [Server Component]
  Client Component SSR:
    ./src/components/AnalyticsPanel.tsx [Client Component SSR]
    ./src/components/DashboardAnalyticsSection.tsx [Client Component SSR]
    ./src/app/page.tsx [Client Component SSR]
    ./src/app/page.tsx [Server Component]
    at <unknown> (./src/components/AnalyticsPanel.tsx:44:12)
```

## Code Locations And Snippets

### src/components/AnalyticsPanel.tsx:44:12

```text
  40 |       value: analytics.needs,
  41 |       color: toneStyles.needs.chart,
  42 |     },
  43 |     {
> 44 |       key: "commitment",
  45 |       label: "Commitment",
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
```

### src/components/AnalyticsPanel.tsx:44:24

```text
  40 |       value: analytics.needs,
  41 |       color: toneStyles.needs.chart,
  42 |     },
  43 |     {
> 44 |       key: "commitment",
  45 |       label: "Commitment",
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
```

### src/components/AnalyticsPanel.tsx:45:14

```text
  41 |       color: toneStyles.needs.chart,
  42 |     },
  43 |     {
  44 |       key: "commitment",
> 45 |       label: "Commitment",
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
```

### src/components/AnalyticsPanel.tsx:45:26

```text
  41 |       color: toneStyles.needs.chart,
  42 |     },
  43 |     {
  44 |       key: "commitment",
> 45 |       label: "Commitment",
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
```

### src/components/AnalyticsPanel.tsx:46:23

```text
  42 |     },
  43 |     {
  44 |       key: "commitment",
  45 |       label: "Commitment",
> 46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
  50 |       key: "wants",
```

### src/components/AnalyticsPanel.tsx:47:24

```text
  43 |     {
  44 |       key: "commitment",
  45 |       label: "Commitment",
  46 |       value: analytics.commitment,
> 47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
  50 |       key: "wants",
  51 |       label: "Wants",
```

### src/components/AnalyticsPanel.tsx:47:35

```text
  43 |     {
  44 |       key: "commitment",
  45 |       label: "Commitment",
  46 |       value: analytics.commitment,
> 47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
  50 |       key: "wants",
  51 |       label: "Wants",
```

### src/components/AnalyticsPanel.tsx:50:12

```text
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
> 50 |       key: "wants",
  51 |       label: "Wants",
  52 |       value: analytics.wants,
  53 |       color: toneStyles.wants.chart,
  54 |     },
```

### src/components/AnalyticsPanel.tsx:50:19

```text
  46 |       value: analytics.commitment,
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
> 50 |       key: "wants",
  51 |       label: "Wants",
  52 |       value: analytics.wants,
  53 |       color: toneStyles.wants.chart,
  54 |     },
```

### src/components/AnalyticsPanel.tsx:51:14

```text
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
  50 |       key: "wants",
> 51 |       label: "Wants",
  52 |       value: analytics.wants,
  53 |       color: toneStyles.wants.chart,
  54 |     },
  55 |   ];
```

### src/components/AnalyticsPanel.tsx:51:21

```text
  47 |       color: toneStyles.commitment.chart,
  48 |     },
  49 |     {
  50 |       key: "wants",
> 51 |       label: "Wants",
  52 |       value: analytics.wants,
  53 |       color: toneStyles.wants.chart,
  54 |     },
  55 |   ];
```

### src/components/AnalyticsPanel.tsx:52:23

```text
  48 |     },
  49 |     {
  50 |       key: "wants",
  51 |       label: "Wants",
> 52 |       value: analytics.wants,
  53 |       color: toneStyles.wants.chart,
  54 |     },
  55 |   ];
  56 | 
```

## Prompt To Paste Into GPT

Please help me debug this Next.js project. Based on the failing output and code snippets above, tell me which file and line I should inspect first, what the likely bug is, and what change I should try.

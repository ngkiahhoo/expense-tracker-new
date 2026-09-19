"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import useSavingsGoals, { createSavingsGoal, touchSavingsGoal, type SavingsGoal, type SavingsGoalStatus } from "@/hooks/useSavingsGoals";
import useFutureExpensePlans from "@/hooks/useFutureExpensePlans";
import useBookkeepingHierarchy from "@/hooks/useBookkeepingHierarchy";
import useGoalProjectionData from "@/hooks/useGoalProjectionData";
import { withBookkeepingHierarchy } from "@/utils/bookkeepingExpenseHierarchy";
import { dateKey } from "@/utils/expenseMath";
import { projectGoal, goalMilestones, whatIfSaving, actualSavingCheck } from "@/utils/goalProjection";
import { formatCurrencyAmount } from "@/utils/currency";
import type { Currency } from "@/types/currency";
import useUnsavedChanges, { confirmPanelClose } from "@/hooks/useUnsavedChanges";

interface GoalForm {
  id: string; name: string; target: string; targetDate: string; currency: Currency;
  includedAssetIds: number[]; living_plan_id: string; status: SavingsGoalStatus;
}
const blankForm = (): GoalForm => ({ id: "", name: "", target: "", targetDate: "", currency: "MYR", includedAssetIds: [], living_plan_id: "", status: "active" });
const displayDate = (date: string | null) => date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-MY", { month: "short", year: "numeric", timeZone: "UTC" }) : "Unavailable";
function Stat({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 text-xl font-semibold">{children}</dd></div>;
}
function WhatIf({ current, target, saving, today, currency }: { current: number; target: number; saving: number; today: string; currency: Currency }) {
  const [amount, setAmount] = useState(String(saving));
  const alternate = amount.trim() ? Number(amount) : NaN;
  const result = whatIfSaving(current, target, saving, alternate, today);
  const change = (value: number, units: string) => Math.abs(value) < 0.05 ? `Same ${units === "days" ? "date" : "estimated time"}` : `${Math.abs(value).toFixed(units === "days" ? 0 : 1)} ${units} ${value > 0 ? "earlier" : "later"}`;
  return <Card className="space-y-4"><h2 className="text-xl font-semibold">What-if Saving</h2>
    <p>Plan Saving: {formatCurrencyAmount(saving, currency)} / month</p>
    <label className="block text-sm">What-if monthly saving<Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
    {!Number.isFinite(alternate) ? <p role="alert">Enter a monthly saving amount.</p> : result.state === "reached" ? <p>Goal reached</p> : result.state === "growing" ? <dl className="grid gap-4 sm:grid-cols-3"><Stat label="New Goal Date">{displayDate(result.date)}</Stat><Stat label="Time Difference">{result.monthsDifference === null ? "No baseline ETA" : change(result.monthsDifference, "months")}</Stat><Stat label="Days Difference">{result.daysDifference === null ? "No baseline ETA" : change(result.daysDifference, "days")}</Stat></dl> : <p>{result.state === "deficit" ? "Goal cannot be reached with this saving amount." : "No progress with this saving amount."}</p>}
  </Card>;
}

export default function SavingsGoalsPage() {
  const today = dateKey();
  const { goals, saveGoals, storageError: goalsError } = useSavingsGoals();
  const plans = useFutureExpensePlans();
  const hierarchy = useBookkeepingHierarchy();
  const data = useGoalProjectionData(today);
  const library = hierarchy.data ? withBookkeepingHierarchy(plans.library, hierarchy.data.types, hierarchy.data.categories) : plans.library;
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState<GoalForm | null>(null);
  useUnsavedChanges(!!form);
  const [error, setError] = useState("");
  const goal = goals.find(g => g.id === selected) ?? goals[0];
  const blocked = data.loading || !!data.error || plans.loading || !!plans.storageError || !hierarchy.data || !!hierarchy.error;
  const result = goal && !blocked ? projectGoal(goal, data.assets, library, today, data.paymentPlans) : null;
  const money = (amount: number) => formatCurrencyAmount(amount, goal?.currency ?? "MYR");
  const milestones = goal && result?.current !== null && result?.current !== undefined && !result.errors.length ? goalMilestones(result.current, goal.targetAmount, result.saving, result.projectionStart ?? today) : [];
  const actual = goal && data.history ? actualSavingCheck(data.history.expenses, data.history.incomes, goal.currency, today) : null;
  const matchingAssetIds = (currency: Currency) => data.assets
    .filter(asset => asset.currency === currency)
    .map(asset => asset.id);
  function startNewGoal() {
    const next = blankForm();
    next.includedAssetIds = matchingAssetIds(next.currency);
    setForm(next);
  }
  function includeMatchingAssets(goalToUpdate: SavingsGoal) {
    const includedAssetIds = [
      ...new Set([
        ...goalToUpdate.includedAssetIds,
        ...matchingAssetIds(goalToUpdate.currency),
      ]),
    ];
    persist(
      goals.map(item =>
        item.id === goalToUpdate.id
          ? touchSavingsGoal({ ...item, includedAssetIds })
          : item,
      ),
    );
  }
  function persist(next: SavingsGoal[]) {
    try { saveGoals(next); setError(""); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save goal."); return false; }
  }
  function edit(g: SavingsGoal) {
    setForm({ id: g.id, name: g.name, target: String(g.targetAmount), targetDate: g.targetDate, currency: g.currency, includedAssetIds: g.includedAssetIds, living_plan_id: g.living_plan_id ?? "", status: g.status });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const targetAmount = Number(form.target);
    if (!form.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0 || targetAmount > 1e12) { setError("Enter a name and a target amount above zero and no greater than one trillion."); return; }
    const old = goals.find(g => g.id === form.id);
    const fields = { name: form.name.trim(), targetAmount, targetDate: form.targetDate, currency: form.currency, includedAssetIds: form.includedAssetIds, living_plan_id: form.living_plan_id || null, status: form.status };
    const next = old ? touchSavingsGoal({ ...old, ...fields }) : createSavingsGoal({ ...fields, manualCurrentAmount: 0, startDate: today, calculationMethod: "income-expenses", pacePeriod: "3m", customStartMonth: "", customEndMonth: "", snapshots: [] });
    if (persist(old ? goals.map(g => g.id === old.id ? next : g) : [...goals, next])) { setSelected(next.id); setForm(null); }
  }
  const cashFlow = result?.cashFlow;
  return <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-6 text-white sm:px-6">
    <header className="flex items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Savings Goals</h1><Button disabled={!!goalsError || data.loading} onClick={startNewGoal}>New Goal</Button></header>
    {goalsError && <p role="alert">{goalsError}</p>}
    {error && <p role="alert">{error}</p>}
    {form && <Card><form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-semibold">{form.id ? "Edit Goal" : "New Goal"}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Goal name<Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Target amount<Input required type="number" min="0.01" max="1000000000000" step="0.01" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} /></label>
        <label>Currency<Select value={form.currency} onChange={e => { const currency = e.target.value as Currency; setForm({ ...form, currency, includedAssetIds: form.id ? form.includedAssetIds : matchingAssetIds(currency) }); }}><option>MYR</option><option>SGD</option></Select></label>
        <label>Target date (optional)<Input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} /></label>
        <label>Living Cost Plan<Select value={form.living_plan_id} disabled={plans.loading || !!plans.storageError} onChange={e => setForm({ ...form, living_plan_id: e.target.value })}><option value="">Select a plan</option>{form.living_plan_id && !library.plans.some(p => p.id === form.living_plan_id) && <option value={form.living_plan_id}>Unavailable plan</option>}{library.plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</Select></label>
        <label>Status<Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as SavingsGoalStatus })}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></Select></label>
      </div>
      <fieldset className="space-y-2"><legend className="mb-2 font-semibold">Included assets</legend>{data.loading ? <p>Loading assets...</p> : data.assets.map(a => <label key={a.id} className="flex items-center gap-3"><input type="checkbox" checked={form.includedAssetIds.includes(a.id)} onChange={e => setForm({ ...form, includedAssetIds: e.target.checked ? [...form.includedAssetIds, a.id] : form.includedAssetIds.filter(id => id !== a.id) })} />{a.name} · {formatCurrencyAmount(a.current_value, a.currency)}</label>)}{form.includedAssetIds.filter(id => !data.assets.some(a => a.id === id)).map(id => <label key={id} className="flex gap-3"><input type="checkbox" checked onChange={() => setForm({ ...form, includedAssetIds: form.includedAssetIds.filter(value => value !== id) })} />Unavailable asset #{id}</label>)}</fieldset>
      <div className="sticky bottom-24 flex flex-wrap gap-2 bg-zinc-950 py-3"><Button type="submit">Save Goal</Button><Button type="button" variant="secondary" onClick={() => { if (confirmPanelClose()) setForm(null); }}>Cancel</Button></div>
    </form></Card>}
    {!!goals.length && <label className="block">Savings Goal<Select value={goal?.id ?? ""} onChange={e => setSelected(e.target.value)}>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></label>}
    {!goals.length && !form && !goalsError && <Card><h2 className="text-xl font-semibold">Create your first savings goal</h2></Card>}
    {[data.error, plans.storageError, hierarchy.error].filter(Boolean).map(message => <p role="alert" key={message}>{message}</p>)}
    {plans.storageError && <Button onClick={plans.retry}>Retry plans</Button>}
    {data.error && <Button onClick={data.retry}>Retry assets</Button>}
    {goal && <>
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">{goal.name}</h2><span className="capitalize">{goal.status}</span></div><div className="flex gap-2"><Button variant="secondary" onClick={() => edit(goal)}>Edit</Button><Button variant="secondary" onClick={() => { if (window.confirm(`Delete ${goal.name}?`)) persist(goals.filter(g => g.id !== goal.id)); }}>Delete</Button></div></div>
        {!data.loading && matchingAssetIds(goal.currency).some(id => !goal.includedAssetIds.includes(id)) && <Button variant="secondary" onClick={() => includeMatchingAssets(goal)}>Include all {goal.currency} assets</Button>}
        {blocked ? <p role="status">{data.error || plans.storageError || hierarchy.error ? "Projection unavailable until data loads successfully." : "Loading projection..."}</p> : <>
          {result?.current !== null && result?.current !== undefined && <><p className="text-3xl font-semibold">{money(result.current)} / {money(goal.targetAmount)}</p><p>{result.progress?.toFixed(1)}% complete</p><progress aria-label="Goal progress" className="h-3 w-full accent-teal-500" max="100" value={result.progress ?? 0} /></>}
          {result?.errors.map(message => <p role="alert" key={message}>{message}</p>)}
          {!result?.errors.length && result?.timeline && <>
            {result.projectionStart && <p className="text-sm text-slate-400">First projected income and saving: {displayDate(result.projectionStart)}</p>}
            {!!result.scheduledCommitments.length && <p className="text-sm text-amber-300">Scheduled payment commitments: {result.scheduledCommitments.map(item => `${item.month} ${money(item.amount)}`).join(" · ")}</p>}
            <dl className="grid gap-4 sm:grid-cols-3"><Stat label="Remaining">{money(result.timeline.remaining)}</Stat>{result.timeline.state === "growing" && <><Stat label="Estimated Goal Date">{displayDate(result.timeline.date)}</Stat><Stat label="Estimated Time">{result.timeline.months!.toFixed(1)} months</Stat></>}</dl>
            {result.timeline.state === "reached" ? <p className="text-xl font-semibold text-teal-500">Goal reached</p> : !result.plan ? <p>Select a Living Cost Plan to calculate your projection.</p> : result.timeline.state === "stalled" ? <p>No progress under this plan. Income equals expenses.</p> : result.timeline.state === "deficit" ? <div><p>Goal cannot be reached under this plan.</p><p>Monthly deficit: {money(-result.saving!)}. Assets are decreasing by {money(-result.saving!)} / month.</p></div> : !result.timeline.date ? <p>The estimated date is beyond the supported calendar range.</p> : null}
          </>}
        </>}
        <div className="border-t border-slate-300/30 pt-4">
          <label className="block font-semibold">Living Cost Plan<Select value={goal.living_plan_id ?? ""} disabled={plans.loading || !!plans.storageError} onChange={e => persist(goals.map(g => g.id === goal.id ? touchSavingsGoal({ ...g, living_plan_id: e.target.value || null }) : g))}><option value="">Select a plan</option>{goal.living_plan_id && !library.plans.some(p => p.id === goal.living_plan_id) && <option value={goal.living_plan_id}>Unavailable plan</option>}{library.plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.currency})</option>)}</Select></label>
          {result?.plan && <Link className="mt-3 inline-block text-teal-500 underline" href={`/future-expense-plans?plan=${encodeURIComponent(result.plan.id)}`}>View Living Cost Plan</Link>}
          {cashFlow && !result?.errors.length && <dl className="mt-4 grid gap-4 sm:grid-cols-2"><Stat label="Monthly Income">{money(cashFlow.income)}</Stat><Stat label="Monthly Living Cost">-{money(cashFlow.expenses!)}</Stat><Stat label="Expected Saving">{money(cashFlow.saving!)} / month</Stat><Stat label="Savings Rate">{cashFlow.savingsRate === null ? "N/A (zero income)" : `${cashFlow.savingsRate.toFixed(1)}%`}</Stat></dl>}
        </div>
      </Card>
      {result && !result.errors.length && result.timeline && <>
        {goal.targetDate && result.timeline.state !== "reached" ? <Card className="space-y-4"><h2 className="text-xl font-semibold">Target Date · {goal.targetDate}</h2>{result.targetMonths === 0 ? <p>Target date is today or has passed. The goal has not been reached.</p> : <><dl className="grid gap-4 sm:grid-cols-3"><Stat label="Required Pace">{result.required === null ? "Unavailable" : money(result.required) + " / month"}</Stat><Stat label="Expected Pace">{result.saving === null ? "Select a plan" : money(result.saving) + " / month"}</Stat><Stat label="Difference">{result.difference === null ? "Unavailable" : `${result.difference >= 0 ? "+" : ""}${money(result.difference)} / month`}</Stat></dl>{result.paceStatus && <p className="font-semibold">{result.paceStatus}</p>}</>}</Card> : !goal.targetDate && result.timeline.date ? <p>No target date — current projection reaches {money(goal.targetAmount)} around {displayDate(result.timeline.date)}.</p> : null}
        <Card className="space-y-4"><h2 className="text-xl font-semibold">Milestone Timeline</h2><ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{milestones.map(m => <li key={m.amount} className="rounded-xl border border-slate-300/30 p-4"><p className="font-semibold">{money(m.amount)}</p><p>{m.status}</p>{m.state !== "reached" && <p>{m.date ? displayDate(m.date) : "No projected date"}</p>}</li>)}</ol></Card>
        {result.current !== null && result.saving !== null && <WhatIf key={`${goal.id}:${result.saving}:${result.projectionStart}`} current={result.current} target={goal.targetAmount} saving={result.saving} today={result.projectionStart ?? today} currency={goal.currency} />}
        {result.saving !== null && <Card className="space-y-3"><h2 className="text-xl font-semibold">Reality Check</h2>{data.historyError ? <p>{data.historyError}</p> : !actual ? <p>Loading completed months...</p> : actual.average === null ? <p>No records in the last 3 completed months.</p> : <><dl className="grid gap-4 sm:grid-cols-3"><Stat label="Expected Saving">{money(result.saving)} / month</Stat><Stat label="Last 3 Completed Months Average">{money(actual.average)} / month</Stat><Stat label="Difference">{money(actual.average - result.saving)} / month</Stat></dl><p>{Math.abs(actual.average - result.saving) < 0.01 ? "Your recent actual saving pace matches this plan." : `Your recent actual saving pace is ${money(Math.abs(actual.average - result.saving))}/month ${actual.average < result.saving ? "below" : "above"} this plan.`}</p><p>{actual.months[0]} to {actual.months[2]}</p></>}</Card>}
      </>}
    </>}
  </main>;
}

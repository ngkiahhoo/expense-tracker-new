"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Compass, Copy, Plus, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Select } from "../../components/ui/Field";
import LifeScenarioEditor from "../../components/LifeScenarioEditor";
import LifeScenarioResults, { money, ScenarioComparison } from "../../components/LifeScenarioResults";
import useLifeScenarios from "../../hooks/useLifeScenarios";
import useSavingsGoals, { createSavingsGoal } from "../../hooks/useSavingsGoals";
import useThemePreference from "../../hooks/useThemePreference";
import { loadScenarioBaseline } from "../../services/lifeScenarioService";
import type { LifeScenario } from "../../types/lifeScenario";
import type { FutureExpenseLibrary } from "../../types/futureExpense";
import type { Currency } from "../../types/currency";
import { analyzeScenario, assumption, buildBaseline, createScenario, dateKey, duplicateScenario, validateScenario } from "../../utils/lifeScenario";

export default function LifeScenariosPage() {
  const { theme, toggleTheme } = useThemePreference();
  const { scenarios, library, saveLibrary, migrated, saveScenario, storageError } = useLifeScenarios();
  const { goals, saveGoals } = useSavingsGoals();
  const [draft, setDraft] = useState<LifeScenario | null>(null);
  const [currency, setCurrency] = useState<Currency>("MYR");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [goalConfirm, setGoalConfirm] = useState(false);
  const [view, setView] = useState<"plan" | "results">("plan");
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const errors = useMemo(() => draft ? validateScenario(draft, library) : [], [draft, library]);
  const result = useMemo(() => draft && !errors.length && draft.baseline.reviewed ? analyzeScenario(draft, library) : null, [draft, errors, library]);
  const comparable = useMemo(() => scenarios.filter(s => compare.includes(s.id) && s.currency === (draft?.currency || currency) && s.baseline.reviewed).map(s => s.id === draft?.id ? draft : s), [scenarios, compare, draft, currency]);
  function canLeave() { return !dirty || window.confirm("Discard unsaved scenario changes?"); }
  function edit(s: LifeScenario) { setDraft(s); setDirty(true); setGoalConfirm(false); }
  async function create(manual = false) {
    if (!canLeave()) return;
    setLoading(true); setMessage("");
    try {
      const today = dateKey();
      const baseline = manual ? buildBaseline({ currency, today, expenses: [], incomes: [], assets: [], categories: [], recurring: [], plans: [] }) : await loadScenarioBaseline(currency, today);
      edit(createScenario(baseline)); setView("plan");
      if (manual) setMessage("Manual baseline: no existing commitments or history were imported. Enter them before reviewing the baseline.");
    } catch (e) { setMessage((e as Error).message); } finally { setLoading(false); }
  }
  const usage = useMemo(() => Object.fromEntries(library.plans.map(p => [p.id, scenarios.filter(s => s.expense_plan_id === p.id || s.phases.some(phase => phase.expense_plan_id === p.id)).length])), [library, scenarios]);
  function updateLibrary(next: FutureExpenseLibrary) {
    saveLibrary(next);
    if (draft) {
      const phases = draft.phases.map(p => ({ ...p, expense_overrides: Object.fromEntries(Object.entries(p.expense_overrides).filter(([id]) => next.plans.find(plan => plan.id === p.expense_plan_id)?.items.some(i => i.id === id))) }));
      if (JSON.stringify(phases) !== JSON.stringify(draft.phases)) edit({ ...draft, phases });
    }
  }
  function save() {
    if (!draft) return;
    try { saveScenario(draft); setDirty(false); setMessage("Scenario saved on this device."); } catch (e) { setMessage(`Could not save: ${(e as Error).message}`); }
  }
  function variants(items: LifeScenario[]) {
    const errors = items.flatMap(item => validateScenario(item, library));
    if (errors.length) throw new Error(errors.join(" "));
    for (const item of items) saveScenario(item);
    setCompare(items.map(x => x.id)); setMessage("Three job-search variants saved. Review their first-salary and lifestyle assumptions before comparing.");
  }
  return <main className={`life-scenarios ${theme === "dark" ? "scenario-dark" : "light-theme"} min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6`}><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} />Dashboard</Link><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Compass className="text-teal-600" />Life Scenarios</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">You define what changes. Explore the financial consequences of a career break, move or new job.</p></div><Link href="/savings-goals" className="text-sm text-teal-700 dark:text-teal-300">Savings goals →</Link></header>
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Hypothetical plans · Saved in this browser, like savings goals · Actual transactions and historical snapshots are never changed</p><Button variant="secondary" onClick={toggleTheme}>{theme === "dark" ? "Light theme" : "Dark theme"}</Button></div>
    {migrated && <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">Existing scenarios were preserved as explicit draft living plans. Review and confirm each plan before projecting. Previous saved data is retained as a backup.</p>}
    {(message || storageError) && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">{storageError || message}</div>}
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><aside className="space-y-4"><Card><h2 className="font-semibold">Your scenarios</h2><div className="mt-3 space-y-2">{scenarios.map(s => <div key={s.id} className={`rounded-lg border p-3 ${draft?.id === s.id ? "border-teal-500" : "border-slate-200 dark:border-slate-700"}`}><button className="w-full text-left text-sm font-medium" onClick={() => { if (canLeave()) { setDraft(structuredClone(s)); setDirty(false); setView(s.baseline.reviewed && !validateScenario(s, library).length ? "results" : "plan"); setGoalConfirm(false); } }}>{s.name}<span className="mt-1 block text-xs font-normal text-slate-500">{s.status} · {s.currency}</span></button><label className="mt-2 flex gap-2 text-xs text-slate-500"><input type="checkbox" checked={compare.includes(s.id)} onChange={e => setCompare(e.target.checked ? [...compare, s.id] : compare.filter(id => id !== s.id))} />Compare</label></div>)}{!scenarios.length && <p className="text-sm text-slate-500">Save your first plan to revisit it or compare alternatives.</p>}</div><div className="mt-4 space-y-2"><Select aria-label="New scenario base currency" value={currency} onChange={e => setCurrency(e.target.value as Currency)}><option>MYR</option><option>SGD</option></Select><Button className="w-full" disabled={loading || !!storageError} onClick={() => create()}><Plus size={16} />{loading ? "Loading baseline…" : "New scenario"}</Button><Button variant="secondary" className="w-full" disabled={loading || !!storageError} onClick={() => create(true)}>Start with manual baseline</Button></div></Card><p className="px-2 text-xs text-slate-500">Compare reviewed scenarios in the same base currency. Different date ranges remain visible.</p></aside>
    <section className="min-w-0 space-y-5">{draft ? <>
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><Button variant={view === "plan" ? "primary" : "secondary"} onClick={() => setView("plan")}>Edit plan</Button><Button variant={view === "results" ? "primary" : "secondary"} disabled={!result} onClick={() => setView("results")}>Projection</Button></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { const copy = duplicateScenario(draft); try { saveScenario(copy); setDraft(copy); setDirty(false); setMessage("Scenario duplicated."); } catch (e) { setMessage((e as Error).message); } }}><Copy size={15} />Duplicate</Button><Button onClick={save} disabled={!!storageError}><Save size={15} />Save{dirty ? " changes" : ""}</Button></div></div><p className="mt-3 text-xs text-slate-500">{dirty ? "Unsaved changes. Projections update immediately as you edit." : "Saved scenario."}</p></Card>
      {errors.length > 0 && <Card><ul className="list-inside list-disc text-sm" role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul></Card>}
      {!draft.baseline.reviewed && <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">Review and confirm the baseline before running the projection.</p>}
      {view === "plan" && <Card><LifeScenarioEditor library={library} onLibraryChange={updateLibrary} usage={usage} key={draft.id} scenario={draft} onChange={edit} onVariants={variants} /><details className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-semibold">Use existing savings-goal snapshots</summary><p className="mt-3 text-sm text-slate-500">Select a goal only if its asset scope matches this scenario. Completed snapshots supply actual asset history and the latest recorded savings pace. They do not change your starting assets or overwrite history.</p><Select className="mt-3" aria-label="Snapshot source goal" defaultValue="" onChange={e => { const goal = goals.find(g => g.id === e.target.value); if (!goal) return; const snapshots = goal.snapshots.filter(x => x.month < draft.baseline.as_of.slice(0, 7)).sort((a, b) => a.month.localeCompare(b.month)); const last = snapshots.at(-1); edit({ ...draft, baseline: { ...draft.baseline, reviewed: false, historical_assets: snapshots.map(x => ({ month: x.month, amount: x.currentAmount })), savings_pace: last ? assumption(last.savingPace ?? last.monthlySaving, draft.currency, "HISTORICAL") : draft.baseline.savings_pace } }); }}><option value="">Choose matching goal scope</option>{goals.filter(g => g.currency === draft.currency).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</Select></details><Button className="mt-5" disabled={!result} onClick={() => setView("results")}>View projection</Button></Card>}
      {view === "results" && result && <><LifeScenarioResults library={library} scenario={draft} goalTarget={goals.find(g => g.id === draft.linked_goal_id)?.targetAmount} /><Card><h2 className="font-semibold">Turn required funds into a savings goal</h2><p className="mt-2 text-sm text-slate-500">Target: {money(result.required, draft.currency)}. Existing goals remain unchanged.</p>{draft.linked_goal_id && goals.some(g => g.id === draft.linked_goal_id) ? <Link href="/savings-goals" className="mt-3 inline-block text-teal-600">Open linked savings goal →</Link> : goalConfirm ? <div className="mt-4 space-y-3"><p>Create “{draft.name} Fund” with target {money(result.required, draft.currency)} and current amount {money(result.starting, draft.currency)}?</p><div className="flex gap-2"><Button onClick={() => { try { const goal = createSavingsGoal({ name: `${draft.name} Fund`, targetAmount: result.required, manualCurrentAmount: result.starting, targetDate: "", startDate: dateKey(), status: "active", currency: draft.currency, calculationMethod: "income-expenses", pacePeriod: "6m", customStartMonth: "", customEndMonth: "", includedAssetIds: [], snapshots: [] }); saveGoals([...goals, goal]); const next = { ...draft, linked_goal_id: goal.id }; setDraft(next); setGoalConfirm(false); setDirty(true); saveScenario(next); setDirty(false); setMessage("Savings goal created. Update its current amount or select matching assets in Savings Goals."); } catch (e) { setMessage(`Could not complete saving: ${(e as Error).message}`); } }}>Confirm create savings goal</Button><Button variant="secondary" onClick={() => setGoalConfirm(false)}>Cancel</Button></div></div> : <Button className="mt-4" onClick={() => setGoalConfirm(true)}>Create savings goal</Button>}</Card></>}
    </> : <Card className="py-12"><h2 className="text-2xl font-semibold">What would you like to explore?</h2><p className="mt-3 max-w-xl text-slate-500">Select available assets and define an explicit monthly living plan, then describe a career break, travel, relocation or a different job. Review how much you need, your lowest cash point and when you could be ready.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{["Plan leaving my job", "Move to another city", "Compare future lifestyles"].map(x => <div className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-950 dark:text-teal-100" key={x}>{x}</div>)}</div></Card>}
    <ScenarioComparison library={library} scenarios={comparable} />
    </section></div>
  </div></main>;
}

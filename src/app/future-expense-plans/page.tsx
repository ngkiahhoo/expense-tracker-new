"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useBookkeepingHierarchy from "@/hooks/useBookkeepingHierarchy";
import { withBookkeepingHierarchy } from "@/utils/bookkeepingExpenseHierarchy";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import useFutureExpensePlans from "@/hooks/useFutureExpensePlans";
import useThemePreference from "@/hooks/useThemePreference";
import type { Currency } from "@/types/currency";
import type { FutureExpenseItem, FutureExpenseLibrary, FutureExpensePlan } from "@/types/futureExpense";
import { duplicateExpensePlan, newExpenseItem, newExpensePlan, ordered } from "@/utils/futureExpense";
import { livingPlanCashFlow, projectLivingExpenses } from "@/utils/livingExpense";

export default function FutureExpensePlansPage() {
  return <Suspense fallback={<p role="status">Loading plan...</p>}><LivingPlanEditor /></Suspense>;
}

function LivingPlanEditor() {
  const searchParams = useSearchParams();
  const { library: savedLibrary, saveLibrary, storageError, loading, status, retry, hasBackup, downloadBackup } = useFutureExpensePlans();
  const bookkeeping = useBookkeepingHierarchy();
  const library = bookkeeping.data ? withBookkeepingHierarchy(savedLibrary, bookkeeping.data.types, bookkeeping.data.categories) : savedLibrary;
  const availableTypes = library.types.filter(t => t.id.startsWith("bookkeeping-type:"));
  const availableCategories = library.categories.filter(c => c.id.startsWith("bookkeeping-category:"));
  const { theme } = useThemePreference();
  const [selected, select] = useState("");
  const [error, setError] = useState("");
  const plan = library.plans.find(p => p.id === (selected || searchParams.get("plan"))) || library.plans[0];
  const months = plan?.months_to_project ?? 12;
  const cashFlow = plan ? livingPlanCashFlow(plan, library) : null;
  const result = plan && bookkeeping.data && !bookkeeping.error ? projectLivingExpenses(plan, library, Number(months)) : null;
  const money = (amount: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: plan?.currency || "MYR" }).format(amount);
  function save(next: FutureExpenseLibrary) {
    if (loading || storageError || !bookkeeping.data || bookkeeping.error) { setError("Wait for bookkeeping categories to load before editing."); return false; }
    try { saveLibrary(next); setError(""); return true; }
    catch (e) { setError((e as Error).message); return false; }
  }
  function update(change: Partial<FutureExpensePlan>) {
    if (plan) save({ ...library, plans: library.plans.map(p => p.id === plan.id ? { ...p, ...change, confirmed: false } : p) });
  }
  function editItem(id: string, change: Partial<FutureExpenseItem>) {
    update({ items: plan.items.map(i => i.id === id ? { ...i, ...change, updated_at: new Date().toISOString() } : i) });
  }
  function create() {
    const next = newExpensePlan(plan?.currency || "MYR", "My Future Living Cost");
    if (save({ ...library, plans: [...library.plans, next] })) select(next.id);
  }
  function itemEditor(item: FutureExpenseItem) {
    return <article key={item.id} aria-label={`Expense ${item.name}`} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Expense name<Input value={item.name} onChange={e => editItem(item.id, { name: e.target.value })} /></label>
        <label className="text-sm">Monthly amount<Input type="number" min="0" max="1000000000000" step="0.01" value={item.amount} onChange={e => { const amount = Number(e.target.value); if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12) editItem(item.id, { amount }); }} /></label>
        <label className="text-sm">Currency<Select value={item.currency} onChange={e => editItem(item.id, { currency: e.target.value as Currency })}><option>MYR</option><option>SGD</option></Select></label>
        <label className="text-sm">Expense type<Select value={item.type_id || ""} onChange={e => editItem(item.id, { type_id: e.target.value || null, category_id: null, source_category_id: undefined })}><option value="">Choose type</option>{ordered(availableTypes).map(t => <option key={t.id} value={t.id}>{t.name}{t.is_active ? "" : " (disabled)"}</option>)}</Select></label>
        <label className="text-sm">Expense category<Select value={item.category_id || ""} onChange={e => editItem(item.id, { category_id: e.target.value || null, source_category_id: undefined })}><option value="">Choose category</option>{ordered(availableCategories.filter(c => c.type_id === item.type_id)).map(c => <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (disabled)"}</option>)}</Select></label>
        <label className="text-sm">Note<Input value={item.note} onChange={e => editItem(item.id, { note: e.target.value })} /></label>
      </div>
      <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={e => editItem(item.id, { enabled: e.target.checked })} />Include expense</label><Button variant="secondary" size="sm" onClick={() => { if (window.confirm(`Delete ${item.name}?`)) update({ items: plan.items.filter(i => i.id !== item.id) }); }}>Delete expense</Button></div>
    </article>;
  }
  return <main className={`expense-plans ${theme === "dark" ? "expense-dark bg-slate-950 text-slate-100" : "light-theme bg-slate-50 text-slate-900"} min-h-screen p-4 sm:p-8`}>
    <div className="mx-auto max-w-5xl space-y-6">
      <header><h1 className="text-3xl font-semibold">Living Cost Plan</h1></header>
      <p role="status" className="sr-only">{status}</p>
      {storageError && <Button onClick={retry}>Retry sync</Button>}
      {hasBackup && <Button variant="secondary" onClick={downloadBackup}>Download unsynced backup</Button>}
      <fieldset disabled={loading || !!storageError} className="space-y-6">
      {!bookkeeping.data && !bookkeeping.error && <p role="status" className="text-sm text-slate-500">Loading bookkeeping types and categories?</p>}
      {bookkeeping.error && <p role="alert" className="text-sm text-amber-600">{bookkeeping.error}</p>}
      {(storageError || error) && <p role="alert" className="rounded-xl border border-amber-400 p-4">{storageError || error}</p>}
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Expense plan<Select value={plan?.id || ""} onChange={e => select(e.target.value)}>{!plan && <option value="">{loading ? "Loading plans?" : storageError ? "Plans unavailable" : "No plans yet"}</option>}{library.plans.map(p => <option key={p.id} value={p.id}>{p.name || "Unnamed plan"}</option>)}</Select></label><Button variant="secondary" disabled={loading || !!storageError || !bookkeeping.data || !!bookkeeping.error} onClick={create}>Create plan</Button></div>
      {!plan ? (loading || storageError ? null : <div className="glass-surface rounded-2xl p-6"><h2 className="text-xl font-medium">Start with your expected expenses</h2></div>) : <>
        <section aria-label="Projection" className="glass-surface grid gap-5 rounded-2xl p-6 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">Total Monthly Expenses</p><output aria-label="Total monthly cost" className="mt-2 block text-3xl font-semibold">{result?.monthly == null ? "—" : money(result.monthly)}</output></div>
          <label className="text-sm">Months to project<Input type="number" min="1" max="1200" step="1" value={months} onChange={e => { const value = Number(e.target.value); if (Number.isInteger(value) && value >= 1 && value <= 1200) update({ months_to_project: value }); }} /></label>
          <div><p className="text-sm text-slate-500">Money required</p><output aria-label="Money required" className="mt-2 block text-3xl font-semibold text-teal-600 dark:text-teal-300">{result?.required == null ? "—" : money(result.required)}</output></div>
          <label className="text-sm">Expected Monthly Income<Input type="number" min="0" max="1000000000000" step="0.01" value={plan.monthly_income ?? 0} onChange={e => { const value = Number(e.target.value); if (Number.isFinite(value) && value >= 0 && value <= 1e12) update({ monthly_income: value }); }} /></label>
          <div><p className="text-sm">Expected Monthly Saving</p><output className="mt-2 block text-2xl font-semibold">{cashFlow?.saving == null ? "Unavailable" : money(cashFlow.saving)} / month</output></div>
          <div><p className="text-sm">Savings Rate</p><output className="mt-2 block text-2xl font-semibold">{cashFlow?.savingsRate == null ? "N/A" : cashFlow.savingsRate.toFixed(1) + "%"}</output></div>
          {!!result?.errors.length && <div role="alert" className="space-y-1 text-sm text-amber-700 dark:text-amber-300 sm:col-span-3">{result.errors.map(message => <p key={message}>{message}</p>)}</div>}
        </section>
        <section className="glass-surface space-y-4 rounded-2xl p-5" aria-label="Plan details">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Plan name<Input value={plan.name} onChange={e => update({ name: e.target.value })} /></label><label className="text-sm">Base currency<Select value={plan.currency} onChange={e => update({ currency: e.target.value as Currency })}><option>MYR</option><option>SGD</option></Select></label></div>
          <label className="block text-sm">Description<Textarea value={plan.description} onChange={e => update({ description: e.target.value })} /></label>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { const copy = duplicateExpensePlan(plan, library); if (save({ ...library, plans: [...library.plans, copy] })) select(copy.id); }}>Duplicate plan</Button><Button variant="secondary" onClick={() => { if (window.confirm(`Delete ${plan.name} and its expense items?`)) save({ ...library, plans: library.plans.filter(p => p.id !== plan.id) }); }}>Delete plan</Button></div>
        </section>
        <section className="space-y-4" aria-label="Monthly expenses"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Monthly expenses</h2><Button variant="secondary" onClick={() => update({ items: [...plan.items, newExpenseItem(plan)] })}>Add expense</Button></div>
          {ordered(library.types).filter(t => plan.items.some(i => i.type_id === t.id)).map(type => <section key={type.id} className="glass-surface space-y-4 rounded-2xl p-5"><h3 className="flex justify-between gap-2 text-lg font-semibold"><span>{type.name}{!type.is_active && " (disabled)"}</span><span>{result?.monthly == null ? "—" : money(result.byType[type.id] || 0)}</span></h3>{ordered(library.categories.filter(c => c.type_id === type.id)).filter(c => plan.items.some(i => i.category_id === c.id)).map(category => <div key={category.id} className="space-y-3"><h4 className="flex justify-between gap-2 text-sm font-medium"><span>{category.name}{!category.is_active && " (disabled)"}</span><span>{result?.monthly == null ? "—" : money(result.byCategory[category.id] || 0)}</span></h4>{plan.items.filter(i => i.category_id === category.id && i.type_id === type.id).map(itemEditor)}</div>)}{plan.items.filter(i => i.type_id === type.id && !library.categories.some(c => c.id === i.category_id && c.type_id === type.id)).map(itemEditor)}</section>)}
          {plan.items.filter(i => !library.types.some(t => t.id === i.type_id)).map(itemEditor)}
        </section>
      </>}
      </fieldset>
    </div>
  </main>;
}

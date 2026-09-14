"use client";

import Link from "next/link";
import { useState } from "react";
import useBookkeepingHierarchy from "@/hooks/useBookkeepingHierarchy";
import { withBookkeepingHierarchy } from "@/utils/bookkeepingExpenseHierarchy";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import useLifeScenarios from "@/hooks/useLifeScenarios";
import useThemePreference from "@/hooks/useThemePreference";
import type { Currency } from "@/types/currency";
import type { FutureExpenseItem, FutureExpenseLibrary, FutureExpensePlan } from "@/types/futureExpense";
import { duplicateExpensePlan, newExpenseItem, newExpensePlan, ordered } from "@/utils/futureExpense";
import { projectLivingExpenses } from "@/utils/livingExpense";

export default function FutureExpensePlansPage() {
  const { library: savedLibrary, saveLibrary, storageError } = useLifeScenarios();
  const bookkeeping = useBookkeepingHierarchy();
  const library = bookkeeping.data ? withBookkeepingHierarchy(savedLibrary, bookkeeping.data.types, bookkeeping.data.categories) : savedLibrary;
  const availableTypes = library.types.filter(t => t.id.startsWith("bookkeeping-type:"));
  const availableCategories = library.categories.filter(c => c.id.startsWith("bookkeeping-category:"));
  const { theme, toggleTheme } = useThemePreference();
  const [selected, select] = useState("");
  const [months, setMonths] = useState("12");
  const [error, setError] = useState("");
  const plan = library.plans.find(p => p.id === selected) || library.plans[0];
  const result = plan && bookkeeping.data && !bookkeeping.error ? projectLivingExpenses(plan, library, Number(months)) : null;
  const money = (amount: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: plan?.currency || "MYR" }).format(amount);
  function save(next: FutureExpenseLibrary) {
    if (!bookkeeping.data || bookkeeping.error) { setError("Wait for bookkeeping categories to load before editing."); return false; }
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
  return <main className={`life-scenarios ${theme === "dark" ? "scenario-dark bg-slate-950 text-slate-100" : "light-theme bg-slate-50 text-slate-900"} min-h-screen p-4 sm:p-8`}>
    <div className="mx-auto max-w-5xl space-y-6">
      <nav className="flex flex-wrap items-center gap-4 text-sm"><Link href="/">← Dashboard</Link><Link href="/life-scenarios">Life Scenarios</Link><Button variant="secondary" size="sm" onClick={toggleTheme}>Switch theme</Button></nav>
      <header><h1 className="text-3xl font-semibold">Future Living Expense Plan</h1><p className="mt-2 text-slate-500">Define your monthly living costs, then choose how many months to cover.</p><p className="mt-1 text-sm text-slate-500">Plans save automatically in this browser and can also be used in Life Scenarios.</p></header>
      {!bookkeeping.data && !bookkeeping.error && <p role="status" className="text-sm text-slate-500">Loading bookkeeping types and categories?</p>}
      {bookkeeping.error && <p role="alert" className="text-sm text-amber-600">{bookkeeping.error}</p>}
      {(storageError || error) && <p role="alert" className="rounded-xl border border-amber-400 p-4">{storageError || error}</p>}
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Expense plan<Select value={plan?.id || ""} onChange={e => select(e.target.value)}>{!plan && <option value="">No plans yet</option>}{library.plans.map(p => <option key={p.id} value={p.id}>{p.name || "Unnamed plan"}</option>)}</Select></label><Button variant="secondary" disabled={!!storageError || !bookkeeping.data || !!bookkeeping.error} onClick={create}>Create plan</Button></div>
      {!plan ? <div className="glass-surface rounded-2xl p-6"><h2 className="text-xl font-medium">Start with your expected expenses</h2><p className="mt-2 text-slate-500">Create a plan, select bookkeeping categories, then enter items such as rent, groceries and family support. No income or savings setup is needed.</p></div> : <>
        <section aria-label="Projection" className="glass-surface grid gap-5 rounded-2xl p-6 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">Total monthly cost</p><output aria-label="Total monthly cost" className="mt-2 block text-3xl font-semibold">{result?.monthly == null ? "—" : money(result.monthly)}</output></div>
          <label className="text-sm">Months to project<Input type="number" min="1" max="1200" step="1" value={months} onChange={e => setMonths(e.target.value)} /></label>
          <div><p className="text-sm text-slate-500">Money required</p><output aria-label="Money required" className="mt-2 block text-3xl font-semibold text-teal-600 dark:text-teal-300">{result?.required == null ? "—" : money(result.required)}</output></div>
          <p className="text-sm text-slate-500 sm:col-span-3">Monthly cost × months. Each included item repeats every month. Disabled items, types and categories are excluded. Dates and other Life Scenario assumptions do not affect this simple projection.</p>
          {!!result?.errors.length && <div role="alert" className="space-y-1 text-sm text-amber-700 dark:text-amber-300 sm:col-span-3">{result.errors.map(message => <p key={message}>{message}</p>)}</div>}
        </section>
        <section className="glass-surface space-y-4 rounded-2xl p-5" aria-label="Plan details">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Plan name<Input value={plan.name} onChange={e => update({ name: e.target.value })} /></label><label className="text-sm">Base currency<Select value={plan.currency} onChange={e => update({ currency: e.target.value as Currency })}><option>MYR</option><option>SGD</option></Select></label></div>
          <label className="block text-sm">Description<Textarea value={plan.description} onChange={e => update({ description: e.target.value })} /></label>
          <p className="text-sm text-slate-500">Enter every included item in the base currency. Changing currency does not convert amounts.</p>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { const copy = duplicateExpensePlan(plan, library); if (save({ ...library, plans: [...library.plans, copy] })) select(copy.id); }}>Duplicate plan</Button><Button variant="secondary" onClick={() => { if (window.confirm(`Delete ${plan.name} and its expense items?`)) save({ ...library, plans: library.plans.filter(p => p.id !== plan.id) }); }}>Delete plan</Button></div>
        </section>
        <div className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">Types and categories come from bookkeeping. <Link href="/" className="text-teal-600 underline dark:text-teal-300">Manage them on the Dashboard</Link>.{bookkeeping.data && !availableCategories.length && <p className="mt-2">Add categories on the Dashboard first.</p>}</div>
        <section className="space-y-4" aria-label="Monthly expenses"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Monthly expenses</h2><Button variant="secondary" onClick={() => update({ items: [...plan.items, newExpenseItem(plan)] })}>Add expense</Button></div>
          {!plan.items.length && <p className="text-slate-500">Add your first expense. Select a type and category from bookkeeping.</p>}
          {ordered(library.types).filter(t => plan.items.some(i => i.type_id === t.id)).map(type => <section key={type.id} className="glass-surface space-y-4 rounded-2xl p-5"><h3 className="flex justify-between gap-2 text-lg font-semibold"><span>{type.name}{!type.is_active && " (disabled)"}</span><span>{result?.monthly == null ? "—" : money(result.byType[type.id] || 0)}</span></h3>{ordered(library.categories.filter(c => c.type_id === type.id)).filter(c => plan.items.some(i => i.category_id === c.id)).map(category => <div key={category.id} className="space-y-3"><h4 className="flex justify-between gap-2 text-sm font-medium"><span>{category.name}{!category.is_active && " (disabled)"}</span><span>{result?.monthly == null ? "—" : money(result.byCategory[category.id] || 0)}</span></h4>{plan.items.filter(i => i.category_id === category.id && i.type_id === type.id).map(itemEditor)}</div>)}{plan.items.filter(i => i.type_id === type.id && !library.categories.some(c => c.id === i.category_id && c.type_id === type.id)).map(itemEditor)}</section>)}
          {plan.items.filter(i => !library.types.some(t => t.id === i.type_id)).map(itemEditor)}
        </section>
      </>}
    </div>
  </main>;
}

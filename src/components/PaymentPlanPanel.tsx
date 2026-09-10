"use client";

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import type { Category } from '@/types/category';
import type { Currency } from '@/types/currency';
import type { PaymentName, PaymentPlan } from '@/types/paymentPlan';
import PaymentNameMenu from '@/components/PaymentNameMenu';
import { groupPaymentPlans } from '@/utils/paymentPlanGroups';
import { changePaymentInstallment, savePaymentPlan } from '@/services/paymentPlanService';
import { buildPaymentSchedule, paymentToday } from '@/utils/paymentSchedule';

interface Props {
  plans: PaymentPlan[];
  names: PaymentName[];
  categories: Category[];
  currency: Currency;
  mainBalance: number | null;
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

export default function PaymentPlanPanel({ plans, names, categories, currency, mainBalance, error, loading, refresh }: Props) {
  const [mode, setMode] = useState('later');
  const [nameId, setNameId] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const selectedName = names.find(item => String(item.id) === nameId);
  const [total, setTotal] = useState('');
  const [count, setCount] = useState('3');
  const [date, setDate] = useState(paymentToday);
  const [category, setCategory] = useState('');
  const [amountOverrides, setAmountOverrides] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const request = useRef<{ key: string; id: string } | null>(null);
  const lock = useRef(false);
  const today = paymentToday();
  const baseSchedule = buildPaymentSchedule(total, mode === 'later' ? 1 : Number(count), date);
  const schedule = baseSchedule.map((item, i) => ({ ...item, amount: Number(amountOverrides[i] ?? item.amount) }));
  const validAmounts = schedule.every((item, i) => /^\d+(\.\d{1,2})?$/.test(amountOverrides[i] ?? String(item.amount)) && item.amount > 0 && item.amount <= 9999999999.99);
  const scheduledCents = schedule.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const difference = (Math.round(Number(total) * 100) - scheduledCents) / 100;
  const scheduleValid = schedule.length > 0 && validAmounts && difference === 0;
  const immediate = schedule.filter(i => i.due_date <= today).reduce((sum, i) => sum + i.amount, 0);
  const visiblePlans = plans.filter(p => p.currency === currency);
  const groups = groupPaymentPlans(plans, currency);
  const pending = visiblePlans.flatMap(p => p.payment_installments).filter(i => i.status === 'scheduled');
  const remaining = pending.reduce((sum, i) => sum + Number(i.amount), 0);
  const monthly = pending.reduce<Record<string, number>>((result, i) => {
    const month = i.due_date.slice(0,7);
    result[month] = (result[month] || 0) + Number(i.amount);
    return result;
  }, {});
  const money = (value: number) => `${currency} ${value.toFixed(2)}`;

  async function run(action: () => Promise<void>) {
    if (lock.current || nameBusy) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try { await action(); await refresh(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not save payment plan'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className="space-y-5">
    <p className="text-sm text-zinc-400">Payments automatically become expenses and reduce your {currency} Main Asset on their due dates (Malaysia time).</p>
    {(error || message) && <p role="alert" className="text-sm text-red-400">{error || message}</p>}
    {mainBalance === null && <p role="alert" className="text-sm text-amber-400">Set a {currency} Main Asset to enable automatic posting. Due payments stay scheduled until one is available.</p>}
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl border border-white/10 p-3">Remaining scheduled<p className="font-semibold">{error || loading ? 'Unavailable' : money(remaining)}</p></div>
      <div className="rounded-xl border border-white/10 p-3">Due this month<p className="font-semibold">{error || loading ? 'Unavailable' : money(monthly[today.slice(0,7)] || 0)}</p></div>
    </div>
    {pending.some(i => i.due_date <= today) && <p className="text-sm text-amber-400">Some due payments are awaiting automatic posting. Check your Main Asset and refresh.</p>}
    <details className="rounded-xl border border-white/10 p-3">
      <summary className="cursor-pointer font-medium">Upcoming cash flow</summary>
      <p className="my-2 text-xs text-zinc-400">Projected Main Asset includes scheduled payments only; future income and other spending are excluded.</p>
      {Object.keys(monthly).length === 0 && <p className="text-sm text-zinc-400">No upcoming payments.</p>}
      {Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, amount], index, entries) => <div key={month} className="flex justify-between gap-2 py-2 text-sm">
        <span>{month}</span><span>−{money(amount)}<br />{mainBalance !== null && <span className="text-xs text-zinc-400">Balance {money(mainBalance - entries.slice(0, index + 1).reduce((sum, [, value]) => sum + value, 0))}</span>}</span>
      </div>)}
    </details>
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (!scheduleValid || !category || !selectedName) { setMessage('Enter valid payment amounts that add up to the total, a name and a category.'); return; }
      void run(async () => {
        const values = { p_name: selectedName.name, p_payment_name_id: selectedName.id, p_category_id: Number(category), p_currency: currency, p_total: Number(total), p_count: schedule.length, p_first_date: date, p_amounts: schedule.map(item => item.amount) };
        const key = JSON.stringify(values);
        if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
        await savePaymentPlan({ ...values, p_id: request.current.id });
        request.current = null;
        setTotal(''); setAmountOverrides({}); setMessage('Payment plan saved.');
      });
    }}>
      <h3 className="font-semibold">New payment plan</h3>
      <label className="block text-sm">Payment type<Select value={mode} onChange={e => { setMode(e.target.value); setAmountOverrides({}); }}><option value="later">Pay Later — one payment</option><option value="installment">Installment — monthly payments</option></Select></label>
      <PaymentNameMenu names={names} value={nameId} onChange={setNameId} refresh={refresh} disabled={busy || loading || !!error} onBusyChange={setNameBusy} />
      <label className="block text-sm">Category<Select required value={category} onChange={e => setCategory(e.target.value)}><option value="">Choose category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
      <label className="block text-sm">Total payable ({currency}, including any fees)<Input required type="number" min="0.01" max="9999999999.99" step="0.01" value={total} onChange={e => { setTotal(e.target.value); setAmountOverrides({}); }} /></label>
      {mode === 'installment' && <label className="block text-sm">Number of months<Input required type="number" min="2" max="360" step="1" value={count} onChange={e => { setCount(e.target.value); setAmountOverrides({}); }} /></label>}
      <label className="block text-sm">{mode === 'later' ? 'Due date' : 'First payment date'}<Input required type="date" min="1900-01-01" max="2200-01-01" value={date} onChange={e => setDate(e.target.value)} /></label>
      {schedule.length > 0 && <details open className="text-sm">
        <summary>Payment schedule · {schedule.length} payment(s)</summary>
        <p className="my-2 text-xs text-zinc-400">Edit each monthly amount. Payments must add up to the total payable. Changing the total or number of months resets the split.</p>
        <div className="max-h-64 overflow-auto space-y-2">
          {schedule.map((item, i) => <label key={i} className="flex items-center justify-between gap-3">
            <span>{i + 1}. {item.due_date}</span>
            <Input aria-label={`Payment ${i + 1} amount (${currency})`} className="w-32 shrink-0" type="number" required min="0.01" max="9999999999.99" step="0.01" value={amountOverrides[i] ?? baseSchedule[i].amount.toFixed(2)} onChange={e => setAmountOverrides(current => ({ ...current, [i]: e.target.value }))} />
          </label>)}
        </div>
        <p className="mt-2">Scheduled total: {money(scheduledCents / 100)} / {money(Number(total))}</p>
        {!validAmounts ? <p role="alert" className="text-amber-400">Each payment must be greater than zero with at most two decimal places.</p> : difference !== 0 && <p role="alert" className="text-amber-400">{difference > 0 ? `${money(difference)} left to allocate.` : `${money(-difference)} over the total payable.`}</p>}
        <Button type="button" disabled={busy} onClick={() => setAmountOverrides({})}>Split equally</Button>
      </details>}
      {scheduleValid && immediate > 0 && <p className="text-sm text-amber-400">Saving will immediately record {money(immediate)} in expenses and deduct it from Main Asset. Only add payments that are not already in your expenses.</p>}
      <Button type="submit" disabled={busy || nameBusy || loading || !!error || !selectedName || mainBalance === null || !scheduleValid}>{busy ? 'Saving…' : scheduleValid && immediate > 0 ? `Create & post ${money(immediate)}` : 'Create plan'}</Button>
    </form>
    <div className="flex items-center justify-between"><h3 className="font-semibold">Payment records</h3><Button type="button" disabled={busy} onClick={() => { void refresh(); }}>Refresh</Button></div>
    {loading ? <p>Loading…</p> : !error && visiblePlans.length === 0 && <p className="text-sm text-zinc-400">No {currency} payment plans yet.</p>}
    {groups.map(group => <details key={group.key} className="rounded-xl border border-white/10 p-3">
      <summary className="cursor-pointer">
        <span className="font-medium">{group.name}</span>
        <span className="block text-xs text-zinc-400">{group.plans.length} plan(s) · {money(group.remaining)} remaining</span>
      </summary>
      <div className="my-3 grid grid-cols-2 gap-3 text-sm">
        <div>Posted<p className="font-medium">{money(group.posted)}</p></div>
        <div>Due this month<p className="font-medium">{money(group.monthly.find(row => row.month === today.slice(0, 7))?.amount || 0)}</p></div>
      </div>
      <div className="mb-3 text-sm">
        <p className="font-medium">Combined monthly payments</p>
        {group.monthly.length ? group.monthly.map(row => <div key={row.month} className="flex justify-between gap-3 py-1"><span>{row.month}</span><span>{money(row.amount)}</span></div>) : <p className="text-zinc-400">No upcoming payments.</p>}
      </div>
      {group.plans.map(plan => {
      const items = [...plan.payment_installments].sort((a, b) => a.sequence - b.sequence);
      const scheduled = items.filter(i => i.status === 'scheduled');
      return <details key={plan.id} className="border-t border-white/10 py-3">
        <summary className="cursor-pointer"><span className="font-medium">{items.length === 1 ? 'Pay Later' : `${items.length}-month installment`} · {items[0]?.due_date} · {money(items.reduce((sum, item) => sum + Number(item.amount), 0))}</span><span className="block text-xs text-zinc-400">{items.filter(i => i.status === 'posted').length}/{items.length} posted · {scheduled.length ? `${money(scheduled.reduce((sum, i) => sum + Number(i.amount), 0))} remaining` : items.every(i => i.status === 'posted') ? 'Completed' : 'Closed'}</span></summary>
        {items.map(item => <div key={item.id} className="space-y-2 border-t border-white/10 py-3 text-sm">
          <div className="flex justify-between gap-2"><span>#{item.sequence} · {item.due_date}<br /><span className="text-xs text-zinc-400">{item.status === 'scheduled' ? 'Scheduled' : item.status === 'posted' ? 'Posted' : item.status === 'reversed' ? 'Reversed' : 'Cancelled'}</span></span><span>{money(Number(item.amount))}</span></div>
          {item.status === 'posted' && <p className="text-xs text-zinc-400">Edit or delete in Expense Records. Deleting restores the original asset balance and reverses this payment.</p>}
          {item.status === 'scheduled' && (editing === item.id ? <div className="space-y-2">
            <label className="block">Amount<Input type="number" min="0.01" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} /></label>
            <label className="block">Due date<Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></label>
            {editDate <= today && <p className="text-amber-400">Saving posts this payment immediately.</p>}
            <Button disabled={busy || !buildPaymentSchedule(editAmount, 1, editDate).length} onClick={() => { void run(async () => { await changePaymentInstallment(item.id, false, Number(editAmount), editDate); setEditing(null); }); }}>Save payment</Button>
            <Button disabled={busy} onClick={() => setEditing(null)}>Close</Button>
          </div> : <div className="flex gap-2"><Button disabled={busy} onClick={() => { setEditing(item.id); setEditAmount(String(item.amount)); setEditDate(item.due_date); }}>Edit</Button><Button disabled={busy} onClick={() => { void run(() => changePaymentInstallment(item.id, true, Number(item.amount), item.due_date)); }}>Cancel payment</Button></div>)}
        </div>)}
      </details>;
      })}
    </details>)}
  </div>;
}

"use client";

import { useRef, useState } from "react";

import PaymentNameMenu from "@/components/PaymentNameMenu";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import useSessionState from "@/hooks/useSessionState";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import { changePaymentInstallment, savePaymentPlan } from "@/services/paymentPlanService";
import type { Category } from "@/types/category";
import type { Currency } from "@/types/currency";
import type { PaymentName, PaymentPlan } from "@/types/paymentPlan";
import { groupPaymentPlans } from "@/utils/paymentPlanGroups";
import { buildPaymentSchedule, paymentToday } from "@/utils/paymentSchedule";

import { SheetFooter } from "./QuickActionSheet";
import ListToolbar, { defaultListFilters } from "./ui/ListToolbar";

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

const statusTone: Record<string, string> = {
  scheduled: "paylater-status-scheduled",
  posted: "paylater-status-posted",
  reversed: "paylater-status-reversed",
  cancelled: "paylater-status-cancelled",
};

export default function PaymentPlanPanel({
  plans,
  names,
  categories,
  currency,
  mainBalance,
  error,
  loading,
  refresh,
}: Props) {
  const [mode, setMode] = useState("later");
  const [nameId, setNameId] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const selectedName = names.find((item) => String(item.id) === nameId);
  const [total, setTotal] = useState("");
  const [count, setCount] = useState("3");
  const [date, setDate] = useState(paymentToday);
  const [category, setCategory] = useState("");
  const [amountOverrides, setAmountOverrides] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [filters, setFilters] = useSessionState(`payment-list:${currency}`, defaultListFilters);
  const [expanded, setExpanded] = useSessionState<string[]>(`payment-list:expanded:${currency}`, []);
  useUnsavedChanges(!!total || editing !== null, busy);

  const request = useRef<{ key: string; id: string } | null>(null);
  const lock = useRef(false);
  const today = paymentToday();
  const baseSchedule = buildPaymentSchedule(total, mode === "later" ? 1 : Number(count), date);
  const schedule = baseSchedule.map((item, i) => ({
    ...item,
    amount: Number(amountOverrides[i] ?? item.amount),
  }));
  const validAmounts = schedule.every(
    (item, i) =>
      /^\d+(\.\d{1,2})?$/.test(amountOverrides[i] ?? String(item.amount)) &&
      item.amount > 0 &&
      item.amount <= 9999999999.99,
  );
  const scheduledCents = schedule.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
  const difference = (Math.round(Number(total) * 100) - scheduledCents) / 100;
  const scheduleValid = schedule.length > 0 && validAmounts && difference === 0;
  const immediate = schedule
    .filter((item) => item.due_date <= today)
    .reduce((sum, item) => sum + item.amount, 0);
  const visiblePlans = plans.filter((plan) => plan.currency === currency);
  const filteredPlans = plans.filter(
    (plan) =>
      plan.name.toLowerCase().includes(filters.query.trim().toLowerCase()) &&
      (filters.status === "all" ||
        plan.payment_installments.some((item) => item.status === filters.status)),
  );
  const groups = groupPaymentPlans(filteredPlans, currency).sort((a, b) => {
    const firstDue = (group: typeof a) =>
      group.plans
        .flatMap((plan) => plan.payment_installments)
        .map((item) => item.due_date)
        .sort()[0] || "";
    return (
      (filters.sort === "name" ? a.name.localeCompare(b.name) : firstDue(a).localeCompare(firstDue(b))) *
      (filters.direction === "asc" ? 1 : -1)
    );
  });
  const pending = visiblePlans
    .flatMap((plan) => plan.payment_installments)
    .filter((item) => item.status === "scheduled");
  const remaining = pending.reduce((sum, item) => sum + Number(item.amount), 0);
  const monthly = pending.reduce<Record<string, number>>((result, item) => {
    const month = item.due_date.slice(0, 7);
    result[month] = (result[month] || 0) + Number(item.amount);
    return result;
  }, {});
  const money = (value: number) => `${currency} ${value.toFixed(2)}`;

  async function run(action: () => Promise<void>) {
    if (lock.current || nameBusy) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save payment plan");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="paylater-note">
        Payments automatically become expenses and reduce your {currency} Main Asset on their due dates (Malaysia time).
      </p>

      {(error || message) && <p role="alert" className="text-sm text-red-400">{error || message}</p>}
      {mainBalance === null && (
        <p role="alert" className="text-sm text-amber-400">
          Set a {currency} Main Asset to enable automatic posting. Due payments stay scheduled until one is available.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="paylater-metric paylater-metric-success">
          <span className="paylater-kicker">Remaining scheduled</span>
          <p className="mt-1 text-base font-semibold">{error || loading ? "Unavailable" : money(remaining)}</p>
        </div>
        <div className="paylater-metric paylater-metric-info">
          <span className="paylater-kicker">Due this month</span>
          <p className="mt-1 text-base font-semibold">
            {error || loading ? "Unavailable" : money(monthly[today.slice(0, 7)] || 0)}
          </p>
        </div>
      </div>

      {pending.some((item) => item.due_date <= today) && (
        <p className="text-sm text-amber-400">
          Some due payments are awaiting automatic posting. Check your Main Asset and refresh.
        </p>
      )}

      <details className="paylater-section">
        <summary className="cursor-pointer font-medium">Upcoming cash flow</summary>
        <p className="my-2 text-xs text-zinc-400">
          Projected Main Asset includes scheduled payments only; future income and other spending are excluded.
        </p>
        {Object.keys(monthly).length === 0 && <p className="text-sm text-zinc-400">No upcoming payments.</p>}
        {Object.entries(monthly)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, amount], index, entries) => (
            <div key={month} className="flex justify-between gap-2 py-2 text-sm">
              <span>{month}</span>
              <span className="text-right">
                -{money(amount)}
                <br />
                {mainBalance !== null && (
                  <span className="text-xs text-zinc-400">
                    Balance {money(mainBalance - entries.slice(0, index + 1).reduce((sum, [, value]) => sum + value, 0))}
                  </span>
                )}
              </span>
            </div>
          ))}
      </details>

      <form
        id="payment-plan-form"
        className="paylater-form space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!scheduleValid || !category || !selectedName) {
            setMessage("Enter valid payment amounts that add up to the total, a name and a category.");
            return;
          }
          void run(async () => {
            const values = {
              p_name: selectedName.name,
              p_payment_name_id: selectedName.id,
              p_category_id: Number(category),
              p_currency: currency,
              p_total: Number(total),
              p_count: schedule.length,
              p_first_date: date,
              p_amounts: schedule.map((item) => item.amount),
            };
            const key = JSON.stringify(values);
            if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
            await savePaymentPlan({ ...values, p_id: request.current.id });
            request.current = null;
            setTotal("");
            setAmountOverrides({});
            setMessage("Payment plan saved.");
          });
        }}
      >
        <div>
          <h3 className="font-semibold">New payment plan</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Choose a one-time pay later item or split it into monthly installments.
          </p>
        </div>

        <label className="block text-sm font-medium">
          Payment type
          <Select className="mt-1" value={mode} onChange={(event) => {
            setMode(event.target.value);
            setAmountOverrides({});
          }}>
            <option value="later">Pay Later - one payment</option>
            <option value="installment">Installment - monthly payments</option>
          </Select>
        </label>

        <PaymentNameMenu
          names={names}
          value={nameId}
          onChange={setNameId}
          refresh={refresh}
          disabled={busy || loading || !!error}
          onBusyChange={setNameBusy}
        />

        <label className="block text-sm font-medium">
          Category
          <Select className="mt-1" required value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Choose category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </label>

        <label className="block text-sm font-medium">
          Total payable ({currency}, including any fees)
          <Input
            className="mt-1"
            required
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            value={total}
            onChange={(event) => {
              setTotal(event.target.value);
              setAmountOverrides({});
            }}
          />
        </label>

        {mode === "installment" && (
          <label className="block text-sm font-medium">
            Number of months
            <Input
              className="mt-1"
              required
              type="number"
              min="2"
              max="360"
              step="1"
              value={count}
              onChange={(event) => {
                setCount(event.target.value);
                setAmountOverrides({});
              }}
            />
          </label>
        )}

        <label className="block text-sm font-medium">
          {mode === "later" ? "Due date" : "First payment date"}
          <Input
            className="mt-1"
            required
            type="date"
            min="1900-01-01"
            max="2200-01-01"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>

        {schedule.length > 0 && (
          <details open className="paylater-schedule text-sm">
            <summary className="cursor-pointer font-semibold">
              Payment schedule - {schedule.length} payment(s)
            </summary>
            <p className="my-2 text-xs paylater-help">
              Edit each monthly amount. Payments must add up to the total payable. Changing the total or number of months resets the split.
            </p>
            <div className="max-h-72 space-y-2 overflow-auto pr-1">
              {schedule.map((item, index) => (
                <label
                  key={index}
                  className="paylater-schedule-row"
                >
                  <span className="min-w-0">
                    <span className="paylater-kicker block">Payment {index + 1}</span>
                    <span className="block truncate font-medium">{item.due_date}</span>
                  </span>
                  <Input
                    aria-label={`Payment ${index + 1} amount (${currency})`}
                    fieldSize="md"
                    className="w-full min-w-0 text-right"
                    type="number"
                    required
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    value={amountOverrides[index] ?? baseSchedule[index].amount.toFixed(2)}
                    onChange={(event) =>
                      setAmountOverrides((current) => ({ ...current, [index]: event.target.value }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="paylater-total mt-3">
              <p className="paylater-kicker">Scheduled total</p>
              <p className="font-semibold">{money(scheduledCents / 100)} / {money(Number(total))}</p>
            </div>
            {!validAmounts ? (
              <p role="alert" className="mt-2 text-amber-400">
                Each payment must be greater than zero with at most two decimal places.
              </p>
            ) : difference !== 0 && (
              <p role="alert" className="mt-2 text-amber-400">
                {difference > 0 ? `${money(difference)} left to allocate.` : `${money(-difference)} over the total payable.`}
              </p>
            )}
            <Button className="mt-3" type="button" disabled={busy} onClick={() => setAmountOverrides({})}>
              Split equally
            </Button>
          </details>
        )}

        {scheduleValid && immediate > 0 && (
          <p className="text-sm text-amber-400">
            Saving will immediately record {money(immediate)} in expenses and deduct it from Main Asset. Only add payments that are not already in your expenses.
          </p>
        )}
        <SheetFooter>
          <Button
            form="payment-plan-form"
            type="submit"
            disabled={busy || nameBusy || loading || !!error || !selectedName || mainBalance === null || !scheduleValid}
          >
            {busy ? "Saving..." : scheduleValid && immediate > 0 ? `Create & post ${money(immediate)}` : "Create plan"}
          </Button>
        </SheetFooter>
      </form>

      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <h3 className="font-semibold">Payment records</h3>
        <Button type="button" disabled={busy} onClick={() => { void refresh(); }}>Refresh</Button>
      </div>

      <ListToolbar
        value={filters}
        onChange={setFilters}
        statuses={[
          { value: "scheduled", label: "Scheduled" },
          { value: "posted", label: "Posted" },
          { value: "cancelled", label: "Cancelled" },
          { value: "reversed", label: "Reversed" },
        ]}
      />
      {!loading && !error && visiblePlans.length > 0 && !groups.length && (
        <p className="text-sm text-zinc-400">No matching payment plans.</p>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : !error && visiblePlans.length === 0 && (
        <p className="text-sm text-zinc-400">No {currency} payment plans yet.</p>
      )}

      {groups.map((group) => (
        <details
          key={group.key}
          open={expanded.includes(group.key)}
          onToggle={(event) => {
            const open = event.currentTarget.open;
            setExpanded((current) =>
              open ? [...new Set([...current, group.key])] : current.filter((key) => key !== group.key),
            );
          }}
          className="paylater-record-group"
        >
          <summary className="cursor-pointer">
            <span className="font-medium">{group.name}</span>
            <span className="paylater-help block text-xs">
              {group.plans.length} plan(s) - {money(group.remaining)} remaining
            </span>
          </summary>
          <div className="my-3 grid grid-cols-2 gap-3 text-sm">
            <div className="paylater-submetric">
              <span className="text-xs text-zinc-400">Posted</span>
              <p className="font-medium">{money(group.posted)}</p>
            </div>
            <div className="paylater-submetric">
              <span className="text-xs text-zinc-400">Due this month</span>
              <p className="font-medium">{money(group.monthly.find((row) => row.month === today.slice(0, 7))?.amount || 0)}</p>
            </div>
          </div>
          <div className="paylater-subpanel mb-3 text-sm">
            <p className="font-medium">Combined monthly payments</p>
            {group.monthly.length ? (
              group.monthly.map((row) => (
                <div key={row.month} className="flex justify-between gap-3 py-1">
                  <span>{row.month}</span>
                  <span>{money(row.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-zinc-400">No upcoming payments.</p>
            )}
          </div>

          {group.plans.map((plan) => {
            const items = [...plan.payment_installments].sort((a, b) => a.sequence - b.sequence);
            const scheduled = items.filter((item) => item.status === "scheduled");
            const installmentAmount = Number(items[0]?.amount || 0);
            return (
              <details key={plan.id} className="paylater-plan">
                <summary className="cursor-pointer">
                  <span className="font-medium">
                    {items.length === 1 ? "Pay Later" : `${items.length}-month installment`} - {items[0]?.due_date} - {money(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                  </span>
                  <span className="paylater-help block text-xs">
                    {items.filter((item) => item.status === "posted").length}/{items.length} posted - {scheduled.length ? `${money(scheduled.reduce((sum, item) => sum + Number(item.amount), 0))} remaining` : items.every((item) => item.status === "posted") ? "Completed" : "Closed"}
                  </span>
                </summary>
                <p className="mt-2 text-sm font-medium">
                  {plan.name} - {money(installmentAmount)} x {items.length} months - {scheduled.length} payment{scheduled.length === 1 ? "" : "s"} remaining
                </p>
                <p className="text-xs text-zinc-400">
                  Remaining balance: {money(scheduled.reduce((sum, item) => sum + Number(item.amount), 0))}
                  {scheduled.length ? ` - Due ${scheduled[0].due_date} to ${scheduled.at(-1)?.due_date}` : ""}
                </p>

                {items.map((item) => (
                  <div key={item.id} className="space-y-2 border-t border-white/10 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span>
                        #{item.sequence} - {item.due_date}
                        <br />
                        <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusTone[item.status] || statusTone.cancelled}`}>
                          {item.status === "scheduled" ? "Scheduled" : item.status === "posted" ? "Posted" : item.status === "reversed" ? "Reversed" : "Cancelled"}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">{money(Number(item.amount))}</span>
                    </div>
                    {item.status === "posted" && (
                      <p className="text-xs text-zinc-400">
                        Edit or delete in Expense Records. Deleting restores the original asset balance and reverses this payment.
                      </p>
                    )}
                    {item.status === "scheduled" && (
                      editing === item.id ? (
                        <div className="paylater-subpanel space-y-2">
                          <label className="block">
                            Amount
                            <Input type="number" min="0.01" step="0.01" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} />
                          </label>
                          <label className="block">
                            Due date
                            <Input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} />
                          </label>
                          {editDate <= today && <p className="text-amber-400">Saving posts this payment immediately.</p>}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={busy || !buildPaymentSchedule(editAmount, 1, editDate).length}
                              onClick={() => {
                                void run(async () => {
                                  await changePaymentInstallment(item.id, false, Number(editAmount), editDate);
                                  setEditing(null);
                                });
                              }}
                            >
                              Save payment
                            </Button>
                            <Button disabled={busy} onClick={() => setEditing(null)}>Close</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={busy} onClick={() => {
                            setEditing(item.id);
                            setEditAmount(String(item.amount));
                            setEditDate(item.due_date);
                          }}>
                            Edit
                          </Button>
                          <Button disabled={busy} onClick={() => {
                            if (window.confirm(`Cancel ${money(Number(item.amount))} due ${item.due_date}? It will no longer be deducted from your account.`)) {
                              void run(() => changePaymentInstallment(item.id, true, Number(item.amount), item.due_date));
                            }
                          }}>
                            Cancel payment
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </details>
            );
          })}
        </details>
      ))}
    </div>
  );
}
